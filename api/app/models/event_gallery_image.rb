class EventGalleryImage < ApplicationRecord
  include HasImageUrl

  STATUSES = %w[pending uploaded processing ready failed].freeze

  belongs_to :event
  belongs_to :event_gallery_upload_batch, optional: true
  has_one_attached :image

  after_commit :enqueue_processing, on: [:create, :update], if: :should_enqueue_processing?

  validates :sort_order, numericality: { greater_than_or_equal_to: 0 }
  validates :status, inclusion: { in: STATUSES }
  validate :image_presence

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
