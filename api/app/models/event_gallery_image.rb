class EventGalleryImage < ApplicationRecord
  include HasImageUrl

  STATUSES = %w[pending uploaded processing ready failed].freeze
  ALLOWED_CONTENT_TYPES = EventGalleryImageUploadPolicy.accepted_content_types.freeze
  MAX_BYTE_SIZE = ENV.fetch("EVENT_GALLERY_IMAGE_MAX_BYTES", 50.megabytes).to_i
  THUMBNAIL_TRANSFORMATIONS = {
    resize_to_fill: [ 600, 400 ],
    format: :jpg,
    saver: { quality: 82, strip: true }
  }.freeze
  LEGACY_THUMBNAIL_TRANSFORMATIONS = {
    resize_to_fill: [ 600, 400 ],
    format: :jpg,
    quality: 82
  }.freeze
  LARGE_TRANSFORMATIONS = {
    resize_to_limit: [ 1800, 1800 ],
    format: :jpg,
    saver: { quality: 86, strip: true }
  }.freeze
  LEGACY_LARGE_TRANSFORMATIONS = {
    resize_to_limit: [ 1800, 1800 ],
    format: :jpg,
    quality: 86
  }.freeze

  belongs_to :event
  belongs_to :event_gallery_upload_batch, optional: true
  has_one_attached :image

  after_commit :enqueue_processing, on: [ :create, :update ], if: :should_enqueue_processing?

  validates :sort_order, numericality: { greater_than_or_equal_to: 0 }
  validates :status, inclusion: { in: STATUSES }
  validate :image_presence
  validate :image_type_and_size

  scope :active, -> { where(active: true) }
  scope :ready, -> { where(status: "ready") }
  scope :sorted, -> { order(:sort_order, :id) }
  scope :with_image_variant_records, -> { includes(image_attachment: { blob: :variant_records }) }

  image_url_for :image

  def thumbnail_url
    variant_url(THUMBNAIL_TRANSFORMATIONS, legacy_transformations: LEGACY_THUMBNAIL_TRANSFORMATIONS)
  end

  def large_url
    variant_url(LARGE_TRANSFORMATIONS, legacy_transformations: LEGACY_LARGE_TRANSFORMATIONS)
  end

  def thumbnail_processed?
    variant_processed?(THUMBNAIL_TRANSFORMATIONS) || variant_processed?(LEGACY_THUMBNAIL_TRANSFORMATIONS)
  end

  def large_processed?
    variant_processed?(LARGE_TRANSFORMATIONS) || variant_processed?(LEGACY_LARGE_TRANSFORMATIONS)
  end

  def variants_processed?
    thumbnail_processed? && large_processed?
  end

  def as_json(options = {})
    super(options.merge(
      methods: [ :image_url, :thumbnail_url, :large_url ],
      except: [ :created_at, :updated_at ]
    ))
  end

  private

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
    unless normalized_content_type.in?(ALLOWED_CONTENT_TYPES)
      errors.add(:image, EventGalleryImageUploadPolicy.validation_error)
    end
    if blob.byte_size.to_i > MAX_BYTE_SIZE
      errors.add(:image, "must be smaller than #{MAX_BYTE_SIZE / 1.megabyte} MB")
    end
  end

  def variant_url(transformations, legacy_transformations: nil)
    return nil unless image.attached? && status == "ready"
    transformations_for_url = processed_transformations(transformations, legacy_transformations)
    return nil unless transformations_for_url

    Rails.application.routes.url_helpers.rails_representation_path(
      image.variant(transformations_for_url),
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

  def processed_transformations(transformations, legacy_transformations)
    return transformations if variant_record_exists?(transformations)
    return legacy_transformations if legacy_transformations && variant_record_exists?(legacy_transformations)

    nil
  end

  def variant_record_exists?(transformations)
    variation_digest = ActiveStorage::Variation.wrap(transformations).digest
    variant_records = image.blob.variant_records
    if variant_records.loaded?
      variant_records.any? { |record| record.variation_digest == variation_digest }
    else
      variant_records.exists?(variation_digest: variation_digest)
    end
  end
end
