class EventRolloverService
  RESET_ATTRIBUTES = {
    status: "draft",
    date: nil,
    end_date: nil,
    is_main_event: false,
    registration_url: nil,
    registration_url_gi: nil,
    registration_url_nogi: nil,
    asjjf_event_ids: [],
    live_stream_url: nil,
    live_stream_active: false,
    results_imported_at: nil,
    translations: {},
    translation_status: "untranslated"
  }.freeze

  def self.call(source_event:, target_season: nil, target_year: nil, copy_hero: true, copy_accommodations: true)
    new(source_event:, target_season:, target_year:, copy_hero:, copy_accommodations:).call
  end

  def initialize(source_event:, target_season:, target_year:, copy_hero:, copy_accommodations:)
    @source_event = source_event
    @target_season = target_season
    @target_year = target_year || target_season&.year
    @copy_hero = copy_hero
    @copy_accommodations = copy_accommodations
  end

  def call
    new_event = source_event.dup
    new_event.assign_attributes(RESET_ATTRIBUTES)
    new_event.source_event = source_event
    new_event.season = target_season
    new_event.name = rollover_text(source_event.name) || "#{source_event.name} (Copy)"
    new_event.slug = unique_slug(new_event.name)

    attachment_copies = []

    ActiveRecord::Base.transaction do
      new_event.save!
      copy_schedule(new_event)
      copy_prizes(new_event)
      attachment_copies.concat(copy_accommodations(new_event)) if @copy_accommodations
    end

    attachment_copies.each { |record, blob| copy_attachment(record.image, blob) }
    copy_attachment(new_event.hero_image, source_event.hero_image.blob) if @copy_hero && source_event.hero_image.attached?

    new_event.reload
  end

  private

  attr_reader :source_event, :target_season, :target_year

  def rollover_text(value)
    return value if value.blank? || target_year.blank?

    source_year = source_event.date&.year || source_event.season&.year
    source_year ? value.to_s.gsub(source_year.to_s, target_year.to_s) : value
  end

  def copy_schedule(new_event)
    source_event.event_schedule_items.each do |item|
      copy = item.dup
      copy.event = new_event
      copy.translations = {}
      copy.translation_status = "untranslated"
      copy.save!
    end
  end

  def copy_prizes(new_event)
    source_event.prize_categories.each do |category|
      copy = category.dup
      copy.event = new_event
      copy.translations = {}
      copy.translation_status = "untranslated"
      copy.save!
    end
  end

  def copy_accommodations(new_event)
    source_event.event_accommodations.map do |accommodation|
      copy = accommodation.dup
      copy.assign_attributes(
        event: new_event,
        check_in_date: nil,
        check_out_date: nil,
        booking_code: nil,
        booking_url: nil,
        translations: {},
        translation_status: "untranslated"
      )
      copy.save!
      [ copy, accommodation.image.blob ] if accommodation.image.attached?
    end.compact
  end

  def copy_attachment(attachment, blob)
    attachment.attach(io: blob.open, filename: blob.filename, content_type: blob.content_type)
  end

  def unique_slug(name)
    base = name.to_s.parameterize.presence || "event"
    slug = base
    counter = 2
    while Event.exists?(slug: slug)
      slug = "#{base}-#{counter}"
      counter += 1
    end
    slug
  end
end
