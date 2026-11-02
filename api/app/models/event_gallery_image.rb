class EventGalleryImage < ApplicationRecord
  include HasImageUrl

  STATUSES = %w[pending uploaded processing ready failed].freeze
  CATEGORY_MAX_LENGTH = 80
  PRESET_CATEGORIES = [
    "Podium",
    "Podium Day 1",
    "Podium Day 2",
    "Tournament Day 1",
    "Tournament Day 2",
    "Venue",
    "Athletes",
    "Opening Ceremony",
    "Sponsors",
    "Other"
  ].freeze
  MAX_BYTE_SIZE = ENV.fetch("EVENT_GALLERY_IMAGE_MAX_BYTES", 50.megabytes).to_i
  THUMBNAIL_TRANSFORMATIONS = {
    resize_to_fill: [ 600, 400 ],
    format: :jpg,
    saver: { quality: 82, strip: true }
  }.freeze
  LARGE_TRANSFORMATIONS = {
    resize_to_limit: [ 1800, 1800 ],
    format: :jpg,
    saver: { quality: 86, strip: true }
  }.freeze

  belongs_to :event
  belongs_to :event_gallery_upload_batch, optional: true
  belongs_to :event_gallery_import, optional: true
  has_many :event_gallery_import_entries, dependent: :nullify
  has_one_attached :image

  before_validation :normalize_category
  before_validation :reset_review_on_replacement
  after_save :ensure_album, if: :saved_change_to_category?
  after_commit :enqueue_processing, on: [ :create, :update ], if: :should_enqueue_processing?

  validates :sort_order, numericality: { greater_than_or_equal_to: 0 }
  validates :status, inclusion: { in: STATUSES }
  validates :category, length: { maximum: CATEGORY_MAX_LENGTH }, allow_blank: true
  validate :image_presence
  validate :image_type_and_size

  scope :active, -> { where(active: true) }
  scope :ready, -> { where(status: "ready") }
  scope :sorted, -> { order(:sort_order, :id) }
  scope :with_image_variant_records, -> { includes(image_attachment: { blob: :variant_records }) }
  scope :categorized_as, ->(category) { where(category: category.to_s.squish) }

  image_url_for :image

  def thumbnail_url
    variant_url(THUMBNAIL_TRANSFORMATIONS)
  end

  def large_url
    variant_url(LARGE_TRANSFORMATIONS)
  end

  def thumbnail_processed?
    variant_processed?(THUMBNAIL_TRANSFORMATIONS)
  end

  def large_processed?
    variant_processed?(LARGE_TRANSFORMATIONS)
  end

  def variants_processed?
    thumbnail_processed? && large_processed?
  end

  def self.category_options_for(event, public_only: false)
    scope = event.event_gallery_images
    scope = scope.active.ready if public_only
    custom_categories = scope.where.not(category: [ nil, "" ]).distinct.pluck(:category)
    albums = event.event_gallery_albums.sorted.pluck(:name)
    albums = albums.select { |name| custom_categories.include?(name) } if public_only
    (albums + PRESET_CATEGORIES + custom_categories.sort).uniq
  end

  def as_json(options = {})
    options = options.dup
    admin = options.delete(:admin)
    excluded = [ :created_at, :updated_at, :preview_position, :public_gallery_images_count,
      :content_sha256, :perceptual_hash, :proposal_base_category, :review_analyzed_at, :review_held, :capture_timezone ]
    excluded += [ :original_filename, :review_flags, :reviewed_at, :captured_at, :capture_source, :album_type, :event_gallery_import_id ] unless admin
    json = super(options.merge(
      methods: [ :image_url, :thumbnail_url, :large_url ] + (admin ? [ :proposed_category ] : []),
      except: excluded
    ))
    unless admin
      filename = original_filename.presence || (image.attached? ? image.blob.filename.to_s : "")
      stem = File.basename(filename, File.extname(filename))
      generated = [ filename, File.basename(filename), stem, stem.gsub(/[-_]+/, " ").strip ].map { |value| value.strip.downcase }.reject(&:blank?)
      %w[title caption alt_text].each do |field|
        json[field] = nil if generated.include?(json[field].to_s.strip.downcase)
      end
    end
    json
  end

  def proposed_category
    return nil unless captured_at

    type = album_type.presence || category.presence
    return nil unless type && type.length <= 65
    PhotoIntake::DayProposals.new(event, type).category_for(self)
  end

  private

  def reset_review_on_replacement
    change = attachment_changes["image"]
    return unless persisted? && change.respond_to?(:blob)
    old_id = ActiveStorage::Attachment.where(record: self, name: "image").pick(:blob_id)
    return unless old_id && old_id != change.blob.id

    self.active = true if review_held?
    assign_attributes(status: "uploaded", review_held: false, review_flags: [], reviewed_at: nil,
      review_analyzed_at: nil, content_sha256: nil, perceptual_hash: nil,
      captured_at: nil, capture_source: nil, capture_timezone: nil,
      event_gallery_import_id: nil, album_type: nil, proposal_base_category: nil,
      processing_token: nil, processing_started_at: nil)
  end

  def ensure_album
    EventGalleryAlbum.ensure_for!(event, category)
  end

  def normalize_category
    self.category = category.to_s.squish.presence
  end

  def should_enqueue_processing?
    image.attached? && status.in?(%w[pending uploaded processing]) && previous_changes.key?("status")
  end

  def enqueue_processing
    ProcessEventGalleryImageJob.perform_later(id)
  end

  def image_presence
    errors.add(:image, "must be attached") unless image.attached?
  end

  def image_type_and_size
    return unless image.attached?

    blob = image.blob
    normalized_content_type = EventGalleryImageUploadPolicy.normalize(
      filename: blob.filename.to_s,
      content_type: blob.content_type
    )
    unless normalized_content_type.in?(EventGalleryImageUploadPolicy.accepted_content_types)
      errors.add(:image, EventGalleryImageUploadPolicy.validation_error(normalized_content_type))
    end
    if blob.byte_size.to_i > MAX_BYTE_SIZE
      errors.add(:image, "must be smaller than #{MAX_BYTE_SIZE / 1.megabyte} MB")
    end
  end

  def variant_url(transformations)
    return nil unless image.attached? && status == "ready"
    return nil unless variant_record_exists?(transformations)

    variant = image.variant(transformations)
    Rails.application.routes.url_helpers.rails_representation_path(
      variant,
      only_path: true
    )
  rescue StandardError, LoadError
    nil
  end

  def variant_processed?(transformations)
    return false unless image.attached?

    variant_record_exists?(transformations)
  rescue StandardError, LoadError
    false
  end

  def variant_record_exists?(transformations)
    variation_digest = image.variant(transformations).variation.digest
    variant_records = image.blob.variant_records
    if variant_records.loaded?
      variant_records.any? { |record| record.variation_digest == variation_digest }
    else
      variant_records.exists?(variation_digest: variation_digest)
    end
  end
end
