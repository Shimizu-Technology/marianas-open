class EventAccommodation < ApplicationRecord
  include HasImageUrl
  include Translatable

  belongs_to :event
  has_one_attached :image

  validates :hotel_name, presence: true

  scope :active, -> { where(active: true) }
  scope :sorted, -> { order(:sort_order) }

  image_url_for :image

  translatable_fields :hotel_name, :description, :room_types, :inclusions, :rate_info
  translation_context "Hotel/accommodation details for jiu-jitsu tournament athletes."

  def as_json(options = {})
    merged_except = (Array(options[:except]) + [:created_at, :updated_at]).uniq
    super(options.merge(except: merged_except)).merge(
      "image_url" => image_url
    )
  end
end
