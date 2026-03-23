class EventAccommodation < ApplicationRecord
  include HasImageUrl

  belongs_to :event
  has_one_attached :image

  validates :hotel_name, presence: true

  scope :active, -> { where(active: true) }
  scope :sorted, -> { order(:sort_order) }

  image_url_for :image

  def as_json(options = {})
    super(options.merge(except: [:created_at, :updated_at])).merge(
      "image_url" => image_url
    )
  end
end
