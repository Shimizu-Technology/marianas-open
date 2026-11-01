class EventRolloverService
  COPY_FIELDS = %w[organization_id venue_name venue_address city country country_code latitude longitude description venue_highlights travel_description visa_description visa_items].freeze
  HOTEL_FIELDS = %w[hotel_name description contact_email contact_phone room_types sort_order].freeze

  def self.target_year(value)
    year = Integer(value.to_s, 10)
    raise ArgumentError, "Target season must be between 2000 and 2100" unless (2000..2100).cover?(year)
    year
  rescue ArgumentError, TypeError
    raise ArgumentError, "Target season must be between 2000 and 2100"
  end

  def self.call(source_event:, target_year:, actor:, keep_tagline: false, asjjf_event_id: nil)
    new(source_event, self.target_year(target_year), actor, keep_tagline, asjjf_event_id).call
  end

  def initialize(source, year, actor, keep_tagline, asjjf_event_id)
    @source, @year, @actor, @keep_tagline, @asjjf_event_id = source, year, actor, keep_tagline, asjjf_event_id
  end

  def call
    source_year = @source.season_year || @source.date&.year || @source.name.to_s[/\b20\d{2}\b/]&.to_i
    raise ArgumentError, "Choose a later season than the source event" if source_year && @year <= source_year
    name = @source.name.to_s.gsub(/\b20\d{2}\b/, @year.to_s)
    name = "#{name} #{@year}" unless name.include?(@year.to_s)
    event = Event.new(@source.attributes.slice(*COPY_FIELDS))
    event.assign_attributes(name: name, slug: unique_slug(name), source_event: @source, season_year: @year,
      status: "draft", is_main_event: false, registration_not_open: false, asjjf_stars: nil,
      tagline: @keep_tagline ? @source.tagline : nil, content_review_required: true,
      travel_items: @source.travel_items.select { |item| item["kind"] != "offer" && item["code"].blank? }.map { |item| item.except("url", "link_label") },
      translations: {}, translation_status: "untranslated")
    event.audit_actor = @actor
    event.audit_action = "rollover"
    event.audit_metadata = { source_event_id: @source.id, source_year: source_year, target_year: @year, keep_tagline: @keep_tagline }
    Event.transaction do
      event.save!
      @source.event_schedule_items.each do |row|
        event.event_schedule_items.create!(row.attributes.slice("time", "description", "sort_order").merge(confirmed: false))
      end
      @source.prize_categories.each do |row|
        event.prize_categories.create!(name: row.name, amount: nil, sort_order: row.sort_order, confirmed: false)
      end
      @source.event_accommodations.each do |row|
        event.event_accommodations.create!(row.attributes.slice(*HOTEL_FIELDS).merge(active: false))
      end
      Asjjf::EventFacts.new(event, actor: @actor).call(@asjjf_event_id) if @asjjf_event_id.present?
    end
    event.reload
  end

  private

  def unique_slug(name)
    base = name.parameterize.presence || "event-#{@year}"
    slug = base
    counter = 2
    while Event.exists?(slug: slug)
      slug = "#{base}-#{counter}"
      counter += 1
    end
    slug
  end
end
