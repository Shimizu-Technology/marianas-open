class EventGalleryImage < ApplicationRecord
  include HasImageUrl

  STATUSES = %w[pending uploaded processing ready failed].freeze
  ALLOWED_CONTENT_TYPES = %w[
    image/jpeg
    image/png
    image/webp
    image/gif
    image/heic
    image/heif
  ].freeze
  MAX_BYTE_SIZE = ENV.fetch("EVENT_GALLERY_IMAGE_MAX_BYTES", 50.megabytes).to_i

  belongs_to :event
  belongs_to :event_gallery_upload_batch, optional: true
  has_one_attached :image

  after_commit :enqueue_processing, on: [:create, :update], if: :should_enqueue_processing?

  validates :sort_order, numericality: { greater_than_or_equal_to: 0 }
  validates :status, inclusion: { in: STATUSES }
  validate :image_presence
  validate :image_type_and_size

  scope :active, -> { where(active: true) }
  scope :ready, -> { where(status: "ready") }
  scope :sorted, -> { order(:sort_order, :id) }

  image_url_for :image

  def thumbnail_url
    variant_url(resize_to_fill: [600, 400])
  end

  def large_url
    variant_url(resize_to_limit: [1800, 1800])
  end

  def as_json(options = {})
    super(options.merge(
      methods: [:image_url, :thumbnail_url, :large_url],
      except: [:created_at, :updated_at]
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
    unless blob.content_type.in?(ALLOWED_CONTENT_TYPES)
      errors.add(:image, "must be a JPEG, PNG, WebP, GIF, HEIC, or HEIF file")
    end
    if blob.byte_size.to_i > MAX_BYTE_SIZE
      errors.add(:image, "must be smaller than #{MAX_BYTE_SIZE / 1.megabyte} MB")
    end
  end

  def variant_url(transformations)
    return nil unless image.attached?

    Rails.application.routes.url_helpers.rails_representation_path(
      image.variant(transformations),
      only_path: true
    )
  rescue StandardError, LoadError
    image_url
  end
end
