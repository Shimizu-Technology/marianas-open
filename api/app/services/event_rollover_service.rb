class EventRolloverService
  PreparedAttachments = Struct.new(:hero, :accommodations, keyword_init: true)

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

  def self.call(source_event:, target_season: nil, target_year: nil, copy_hero: true, copy_accommodations: true, prepared_attachments: nil)
    owns_prepared_attachments = prepared_attachments.nil?
    prepared_attachments ||= prepare_attachments(source_event:, copy_hero:, copy_accommodations:)

    service = new(
      source_event:,
      target_season:,
      target_year:,
      copy_hero:,
      copy_accommodations:,
      prepared_attachments:
    )
    service.call
  rescue StandardError
    purge_prepared_attachments(prepared_attachments) if owns_prepared_attachments && !service&.committed?
    raise
  end

  def self.prepare_attachments(source_event:, copy_hero: true, copy_accommodations: true)
    prepared = PreparedAttachments.new(hero: nil, accommodations: {})
    prepared.hero = duplicate_blob(source_event.hero_image.blob) if copy_hero && source_event.hero_image.attached?

    if copy_accommodations
      source_event.event_accommodations.each do |accommodation|
        next unless accommodation.image.attached?

        prepared.accommodations[accommodation.id] = duplicate_blob(accommodation.image.blob)
      end
    end

    prepared
  rescue StandardError
    purge_prepared_attachments(prepared)
    raise
  end

  def self.purge_prepared_attachments(prepared)
    return unless prepared

    [ prepared.hero, *prepared.accommodations.values ].compact.each(&:purge)
  end

  def initialize(source_event:, target_season:, target_year:, copy_hero:, copy_accommodations:, prepared_attachments:)
    @source_event = source_event
    @target_season = target_season
    @target_year = target_year || target_season&.year
    @copy_hero = copy_hero
    @copy_accommodations = copy_accommodations
    @prepared_attachments = prepared_attachments
    @committed = false
  end

  attr_reader :committed

  alias_method :committed?, :committed

  def call
    new_event = source_event.dup
    new_event.assign_attributes(RESET_ATTRIBUTES)
    new_event.source_event = source_event
    new_event.season = target_season
    new_event.name = rollover_text(source_event.name) || "#{source_event.name} (Copy)"
    new_event.slug = unique_slug(new_event.name)

    ActiveRecord::Base.transaction do
      new_event.save!
      new_event.hero_image.attach(prepared_attachments.hero) if prepared_attachments.hero
      copy_schedule(new_event)
      copy_prizes(new_event)
      copy_accommodations(new_event) if @copy_accommodations
    end
    @committed = true

    new_event.reload
  end

  private

  attr_reader :source_event, :target_season, :target_year, :prepared_attachments

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
    source_event.event_accommodations.each do |accommodation|
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
      prepared_blob = prepared_attachments.accommodations[accommodation.id]
      copy.image.attach(prepared_blob) if prepared_blob
    end
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

  def self.duplicate_blob(source_blob)
    source_blob.open do |io|
      ActiveStorage::Blob.create_and_upload!(
        io:,
        filename: source_blob.filename,
        content_type: source_blob.content_type,
        metadata: source_blob.metadata,
        service_name: source_blob.service_name,
        identify: false
      )
    end
  end
  private_class_method :duplicate_blob
end
