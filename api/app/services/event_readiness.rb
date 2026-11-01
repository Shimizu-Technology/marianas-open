class EventReadiness
  TEXT_FIELDS = %w[name tagline description venue_name venue_address city country schedule_note prize_title prize_description travel_description visa_description venue_highlights registration_steps registration_fee_sections registration_info_items travel_items visa_items ticket_options ticket_in_person_address].freeze

  def initialize(event)
    @event = event
  end

  def call
    checks = [
      check("name", "Event name is set", @event.name.present?, "basics"),
      check("slug", "Public URL is present and unique", unique_slug?, "basics"),
      check("season", "Season year is set", year.present?, "basics"),
      check("date", "Event dates are set and belong to this season", valid_dates?, "dates"),
      check("venue", "Venue is set", @event.venue_name.present?, "venue"),
      check("registration", "Registration link or ‘not open yet’ is set", registration_ready?, "dates"),
      check("schedule", "Every schedule row is confirmed", rows_confirmed?(:event_schedule_items), "schedule"),
      check("prizes", "Every prize row is confirmed", rows_confirmed?(:prize_categories), "prizes"),
      check("stale_year", "Text has no references to another season", stale_years.empty?, "basics"),
      check("stars", "Star rating matches saved ASJJF facts or is blank", stars_sourced?, "basics"),
      check("content_review", "Copied descriptions, travel and hotel details reviewed", !@event.content_review_required?, "venue")
    ]
    { publishable: checks.all? { |item| item[:complete] }, completed: checks.count { |item| item[:complete] }, total: checks.size, checks: checks }
  end

  private

  def year
    @event.season_year || @event.date&.year
  end

  def valid_dates?
    @event.date.present? && @event.date.year == year && (@event.end_date.nil? || (@event.end_date >= @event.date && @event.end_date.year == year))
  end

  def unique_slug?
    @event.slug.present? && @event.slug.match?(/\A[a-z0-9]+(?:-[a-z0-9]+)*\z/) && !Event.where(slug: @event.slug).where.not(id: @event.id).exists?
  end

  def registration_ready?
    @event.registration_not_open? || Event::ASJJF_REGISTRATION_URL_FIELDS.any? do |field|
      uri = URI.parse(@event.public_send(field).to_s)
      uri.is_a?(URI::HTTP) && uri.host.present?
    rescue URI::InvalidURIError
      false
    end
  end

  def rows_confirmed?(association)
    @event.public_send(association).reject(&:marked_for_destruction?).all?(&:confirmed?)
  end

  def stale_years
    return [] unless year
    content = TEXT_FIELDS.map { |field| @event.public_send(field).to_json }
    { event_schedule_items: %w[time description], prize_categories: %w[name], event_accommodations: %w[hotel_name description rate_info inclusions room_types booking_code booking_url] }.each do |association, fields|
      content.concat(@event.public_send(association).reject(&:marked_for_destruction?).map do |row|
        row.attributes.slice(*fields).values.join(" ")
      end)
    end
    content.join(" ").scan(/\b20\d{2}\b/).uniq.reject { |value| value.to_i == year }
  end

  def stars_sourced?
    return true if @event.asjjf_stars.nil?
    snapshot = AsjjfSnapshot.find_by(id: @event.asjjf_info_snapshot_id, page_type: "event_info", parse_status: "parsed", outcome: "ok", asjjf_id: @event.asjjf_info_id)
    stars = snapshot&.parsed_summary&.fetch("stars", nil)
    stars.present? && stars.to_i == @event.asjjf_stars
  end

  def check(key, label, complete, section)
    { key: key, label: label, complete: !!complete, blocking: true, section: section }
  end
end
