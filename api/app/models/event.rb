class Event < ApplicationRecord
  include HasImageUrl

  belongs_to :organization
  has_many :event_schedule_items, dependent: :destroy
  has_many :prize_categories, dependent: :destroy
  has_many :videos, dependent: :nullify
  has_one_attached :hero_image

  accepts_nested_attributes_for :event_schedule_items, allow_destroy: true
  accepts_nested_attributes_for :prize_categories, allow_destroy: true

  image_url_for :hero_image

  def as_json(options = {})
    super(options.merge(
      methods: [:hero_image_url],
      except: [:created_at, :updated_at]
    ))
  end
end
