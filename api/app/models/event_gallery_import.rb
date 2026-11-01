class EventGalleryImport < ApplicationRecord
  belongs_to :event
  has_one_attached :archive
  has_many :event_gallery_import_entries, dependent: :destroy
  has_many :event_gallery_images, dependent: :nullify
  validates :album_type, presence: true, length: { maximum: 65 }
  validates :category, length: { maximum: EventGalleryImage::CATEGORY_MAX_LENGTH }, allow_blank: true
  validates :status, inclusion: { in: %w[queued processing completed failed] }
  validate :valid_timezone

  def as_json(*)
    attributes.except("source_blob_id", "prepared_by_id", "entry_errors", "updated_at").merge("errors" => entry_errors)
  end

  def terminal?
    status.in?(%w[completed failed])
  end

  private

  def valid_timezone
    PhotoIntake::CaptureTime.zone(timezone)
  rescue ArgumentError
    errors.add(:timezone, "must be an IANA timezone")
  end
end
