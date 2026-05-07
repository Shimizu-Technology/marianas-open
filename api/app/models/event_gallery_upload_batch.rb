class EventGalleryUploadBatch < ApplicationRecord
  STATUSES = %w[uploading completed failed cancelled].freeze

  belongs_to :event
  has_many :event_gallery_images, dependent: :nullify

  validates :status, inclusion: { in: STATUSES }
  validates :total_files, :uploaded_files, :failed_files, numericality: { greater_than_or_equal_to: 0 }
  validates :total_bytes, numericality: { greater_than_or_equal_to: 0 }

  scope :recent, -> { order(created_at: :desc) }

  def refresh_counts!
    with_lock do
      return if status == "cancelled"

      images = event_gallery_images
      uploaded = images.where(status: %w[uploaded processing ready]).count
      failed = images.where(status: "failed").count
      next_status = if total_files.positive? && uploaded + failed >= total_files
        failed.positive? ? "failed" : "completed"
      else
        "uploading"
      end

      update!(
        uploaded_files: uploaded,
        failed_files: failed,
        status: next_status,
        completed_at: next_status == "uploading" ? nil : Time.current
      )
    end
  end

  def as_json(options = {})
    super(options.merge(except: [:updated_at]))
  end
end
