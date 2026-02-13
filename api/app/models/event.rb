class Event < ApplicationRecord
  belongs_to :organization
  has_many :event_schedule_items, dependent: :destroy
  has_many :prize_categories, dependent: :destroy

  accepts_nested_attributes_for :event_schedule_items, allow_destroy: true
  accepts_nested_attributes_for :prize_categories, allow_destroy: true
  has_many :videos, dependent: :nullify
  has_one_attached :hero_image

  def hero_image_url
    return nil unless hero_image.attached?
    Rails.application.routes.url_helpers.url_for(hero_image) rescue nil
  end

  def as_json(options = {})
    super(options.merge(
      methods: [:hero_image_url],
      include: {
        event_schedule_items: { except: [:created_at, :updated_at] },
        prize_categories: { except: [:created_at, :updated_at] }
      },
      except: [:created_at, :updated_at]
    ))
  end
end
