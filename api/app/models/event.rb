class Event < ApplicationRecord
  include HasImageUrl
  include Translatable

  STATUSES = %w[draft upcoming live completed cancelled].freeze
  PUBLIC_STATUSES = %w[upcoming live completed cancelled].freeze
  AUTO_COMPLETABLE_STATUSES = %w[upcoming live].freeze
  ASJJF_REGISTRATION_URL_FIELDS = %i[registration_url registration_url_gi registration_url_nogi].freeze
  TICKET_SALES_STATUSES = %w[unavailable on_sale sold_out closed].freeze
  MAX_TICKET_OPTIONS = 12
  MAX_TICKET_BANNER_BYTES = 8.megabytes
  TICKET_BANNER_CONTENT_TYPES = %w[image/jpeg image/png image/webp].freeze

  before_validation :normalize_asjjf_registration_urls
  before_validation :normalize_ticket_sales_url
  before_save :make_main_event_exclusive

  validates :status, inclusion: { in: STATUSES }, allow_nil: true
  validates :ticket_sales_status, inclusion: { in: TICKET_SALES_STATUSES }
  validate :ticket_sales_url_is_safe
  validate :ticket_options_are_valid
  validate :ticket_banner_image_is_safe

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
  has_one_attached :ticket_banner_image

  accepts_nested_attributes_for :event_schedule_items, allow_destroy: true
  accepts_nested_attributes_for :prize_categories, allow_destroy: true

  image_url_for :hero_image
  image_url_for :poster_image
  image_url_for :ticket_banner_image

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

  def self.asjjf_event_info_url(url)
    return url if url.blank?

    url.to_s.strip.gsub(%r{/main/eventNotice/(?=\d)}i, "/main/eventInfo/")
  end

  def asjjf_source_urls
    (asjjf_event_ids || []).map { |id| "https://asjjf.org/main/eventResults/#{id}" }
  end

  def gallery_images_count
    return @preloaded_public_gallery_images_count if defined?(@preloaded_public_gallery_images_count)

    if event_gallery_images.loaded?
      public_gallery_images.size
    else
      event_gallery_images.active.ready.count
    end
  end

  def gallery_preview_images
    return @preloaded_public_gallery_preview_images if defined?(@preloaded_public_gallery_preview_images)

    if event_gallery_images.loaded?
      public_gallery_images.first(8)
    else
      event_gallery_images.active.ready.sorted.with_image_variant_records.limit(8)
    end
  end

  def preload_public_gallery(count:, preview_images:)
    @preloaded_public_gallery_images_count = count
    @preloaded_public_gallery_preview_images = preview_images
    self
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
    { field: :visa_items, sub_fields: [:title, :description] },
    { field: :ticket_options, sub_fields: [:label, :description] }
  )
  translation_context "Marianas Open jiu-jitsu tournament events. Translate naturally for the target audience."

  def as_json(options = {})
    super(options.merge(
      methods: [:hero_image_url, :poster_image_url, :ticket_banner_image_url, :asjjf_source_urls, :gallery_images_count],
      include: {
        event_schedule_items: { except: [:created_at, :updated_at] },
        prize_categories: { except: [:created_at, :updated_at] },
        event_accommodations: { except: [:created_at, :updated_at] }
      },
      except: [:created_at, :updated_at]
    )).merge("event_gallery_images" => gallery_preview_images.as_json)
  end

  private

  def normalize_asjjf_registration_urls
    ASJJF_REGISTRATION_URL_FIELDS.each do |field|
      value = public_send(field)
      next if value.blank?

      public_send("#{field}=", self.class.asjjf_event_info_url(value))
    end
  end

  def normalize_ticket_sales_url
    self.ticket_sales_url = ticket_sales_url.to_s.strip.presence
  end

  def make_main_event_exclusive
    return unless is_main_event? && organization_id.present?

    Event.where(organization_id: organization_id, is_main_event: true)
         .where.not(id: id)
         .update_all(is_main_event: false, updated_at: Time.current)
  end

  def ticket_sales_url_is_safe
    return if ticket_sales_url.blank?

    uri = URI.parse(ticket_sales_url)
    errors.add(:ticket_sales_url, "must use http or https") unless uri.is_a?(URI::HTTP) && uri.host.present?
  rescue URI::InvalidURIError
    errors.add(:ticket_sales_url, "must be a valid URL")
  end

  def ticket_options_are_valid
    unless ticket_options.is_a?(Array)
      errors.add(:ticket_options, "must be a list")
      return
    end

    if ticket_options.length > MAX_TICKET_OPTIONS
      errors.add(:ticket_options, "cannot contain more than #{MAX_TICKET_OPTIONS} options")
      return
    end

    ticket_options.each_with_index do |option, index|
      unless option.is_a?(Hash)
        errors.add(:ticket_options, "option #{index + 1} must be an object")
        next
      end

      label = option["label"] || option[:label]
      description = option["description"] || option[:description]
      errors.add(:ticket_options, "option #{index + 1} needs a label") if label.blank?
      errors.add(:ticket_options, "option #{index + 1} label is too long") if label.to_s.length > 80
      errors.add(:ticket_options, "option #{index + 1} description is too long") if description.to_s.length > 120

      %w[early_bird_price regular_price].each do |price_key|
        price = option[price_key] || option[price_key.to_sym]
        next if price.blank?

        decimal_price = BigDecimal(price.to_s)
        errors.add(:ticket_options, "option #{index + 1} #{price_key.humanize.downcase} must be finite") unless decimal_price.finite?
        errors.add(:ticket_options, "option #{index + 1} #{price_key.humanize.downcase} cannot be negative") if decimal_price.negative?
        errors.add(:ticket_options, "option #{index + 1} #{price_key.humanize.downcase} is too large") if decimal_price > 100_000
      rescue ArgumentError
        errors.add(:ticket_options, "option #{index + 1} #{price_key.humanize.downcase} must be a number")
      end
    end
  end

  def ticket_banner_image_is_safe
    return unless ticket_banner_image.attached?

    blob = ticket_banner_image.blob
    errors.add(:ticket_banner_image, "must be a JPEG, PNG, or WebP image") unless TICKET_BANNER_CONTENT_TYPES.include?(blob.content_type)
    errors.add(:ticket_banner_image, "must be smaller than 8 MB") if blob.byte_size > MAX_TICKET_BANNER_BYTES
  end

  def public_gallery_images
    event_gallery_images
      .select { |image| image.active && image.status == "ready" }
      .sort_by { |image| [image.sort_order || 0, image.id || 0] }
  end
end
