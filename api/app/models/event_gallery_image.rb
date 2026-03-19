class EventGalleryImage < ApplicationRecord
  include HasImageUrl

  belongs_to :event
  has_one_attached :image

  validates :sort_order, numericality: { greater_than_or_equal_to: 0 }
  validate :image_presence

  scope :active, -> { where(active: true) }
  scope :sorted, -> { order(:sort_order, :id) }

  image_url_for :image

  def as_json(options = {})
    super(options.merge(
      methods: [:image_url],
      except: [:created_at, :updated_at]
    ))
  end

  private

  def image_presence
    errors.add(:image, "must be attached") unless image.attached?
  end
end
