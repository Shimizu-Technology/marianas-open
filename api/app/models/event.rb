class Event < ApplicationRecord
  include HasImageUrl
  include Translatable

  belongs_to :organization
  has_many :event_schedule_items, dependent: :destroy
  has_many :prize_categories, dependent: :destroy
  has_many :videos, dependent: :nullify
  has_many :event_results, dependent: :destroy
  has_many :event_accommodations, dependent: :destroy
  has_many :event_gallery_images, dependent: :destroy
  has_one_attached :hero_image

  accepts_nested_attributes_for :event_schedule_items, allow_destroy: true
  accepts_nested_attributes_for :prize_categories, allow_destroy: true

  image_url_for :hero_image

  def asjjf_source_urls
    (asjjf_event_ids || []).map { |id| "https://asjjf.org/main/eventResults/#{id}" }
  end

  translatable_fields :name, :description, :tagline, :venue_name, :city, :country,
                      :schedule_note, :prize_title, :prize_description,
                      :travel_description, :visa_description
  translatable_json_fields(
    { field: :venue_highlights, sub_fields: [:title, :description] },
    { field: :registration_steps, sub_fields: [:title, :description, :link_label] },
    { field: :registration_fee_sections, sub_fields: [:title], nested: { rows: [:deadline, :option] } },
    { field: :registration_info_items, sub_fields: [:label, :value] },
    { field: :travel_items, sub_fields: [:title, :description] },
    { field: :visa_items, sub_fields: [:title, :description] }
  )
  translation_context "Marianas Open jiu-jitsu tournament events. Translate naturally for the target audience."

  def as_json(options = {})
    super(options.merge(
      methods: [:hero_image_url, :asjjf_source_urls],
      include: {
        event_schedule_items: { except: [:created_at, :updated_at] },
        prize_categories: { except: [:created_at, :updated_at] },
        event_accommodations: { except: [:created_at, :updated_at] },
        event_gallery_images: { methods: [:image_url], except: [:created_at, :updated_at] }
      },
      except: [:created_at, :updated_at]
    ))
  end
end
