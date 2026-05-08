class Event < ApplicationRecord
  include HasImageUrl
  include Translatable

  STATUSES = %w[draft upcoming live completed cancelled].freeze
  PUBLIC_STATUSES = %w[upcoming live completed cancelled].freeze
  AUTO_COMPLETABLE_STATUSES = %w[upcoming live].freeze

  validates :status, inclusion: { in: STATUSES }, allow_nil: true

  belongs_to :organization
  has_many :event_schedule_items, dependent: :destroy
  has_many :prize_categories, dependent: :destroy
  has_many :videos, dependent: :nullify
  has_many :event_results, dependent: :destroy
  has_many :event_accommodations, dependent: :destroy
  has_many :event_gallery_images, dependent: :destroy
  has_many :event_gallery_upload_batches, dependent: :destroy
  has_one_attached :hero_image
  has_one_attached :poster_image

  accepts_nested_attributes_for :event_schedule_items, allow_destroy: true
  accepts_nested_attributes_for :prize_categories, allow_destroy: true

  image_url_for :hero_image
  image_url_for :poster_image

  scope :publicly_visible, -> { where(status: PUBLIC_STATUSES) }

  def self.complete_past_events!(today: Date.current)
    where(status: AUTO_COMPLETABLE_STATUSES)
      .where.not(date: nil)
      .where("COALESCE(end_date, date) < ?", today)
      .update_all(status: "completed", updated_at: Time.current)
  end

  def complete_if_past!(today: Date.current)
    return false unless status.in?(AUTO_COMPLETABLE_STATUSES)
    return false unless date.present?
    return false unless (end_date || date) < today

    update_columns(status: "completed", updated_at: Time.current)
    true
  end

  def self.publicly_visible_ids_sql
    publicly_visible.select(:id).to_sql
  end

  def asjjf_source_urls
    (asjjf_event_ids || []).map { |id| "https://asjjf.org/main/eventResults/#{id}" }
  end

  def gallery_images_count
    if event_gallery_images.loaded?
      public_gallery_images.size
    else
      event_gallery_images.active.ready.count
    end
  end

  def gallery_preview_images
    if event_gallery_images.loaded?
      public_gallery_images.first(8)
    else
      event_gallery_images.active.ready.sorted.with_attached_image.limit(8)
    end
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
      methods: [:hero_image_url, :poster_image_url, :asjjf_source_urls, :gallery_images_count],
      include: {
        event_schedule_items: { except: [:created_at, :updated_at] },
        prize_categories: { except: [:created_at, :updated_at] },
        event_accommodations: { except: [:created_at, :updated_at] }
      },
      except: [:created_at, :updated_at]
    )).merge("event_gallery_images" => gallery_preview_images.as_json)
  end

  private

  def public_gallery_images
    event_gallery_images
      .select { |image| image.active && image.status == "ready" }
      .sort_by { |image| [image.sort_order || 0, image.id || 0] }
  end
end
