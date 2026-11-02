class EventReadiness
  TEXT_FIELDS = %w[name tagline description venue_name venue_address city country schedule_note prize_title prize_description travel_description visa_description venue_highlights registration_steps registration_fee_sections registration_info_items travel_items visa_items ticket_options ticket_in_person_address].freeze

  def initialize(event, slug_ids: nil, snapshots: nil)
    @event = event
    @slug_ids = slug_ids
    @snapshots = snapshots
  end

  def call
    stale = stale_references
    stale_label = stale.empty? ? "Text has no references to another season" : "Review old season text: #{stale.map { |item| "#{item[:label]} (#{item[:years].join(', ')})" }.join('; ')}"
    checks = [
      check("name", "Event name is set", @event.name.present?, "basics"),
      check("slug", "Public URL is present and unique", unique_slug?, "basics"),
      check("season", "Season year is set", year.present?, "basics"),
      check("date", "Event dates are set and belong to this season", valid_dates?, "dates"),
      check("venue", "Venue is set", @event.venue_name.present?, "venue"),
      check("registration", "Registration link or ‘not open yet’ is set", registration_ready?, "dates"),
      check("schedule", "Every schedule row is confirmed", rows_confirmed?(:event_schedule_items), "schedule"),
      check("prizes", "Every prize row is confirmed", rows_confirmed?(:prize_categories), "prizes"),
      check("stale_year", stale_label, stale.empty?, stale.first&.fetch(:section) || "basics"),
      check("stars", "Star rating matches saved ASJJF facts or is blank", stars_sourced?, "basics"),
      check("content_review", "Copied descriptions, travel and hotel details reviewed", !@event.content_review_required?, "publishing")
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
    @event.slug.present? && @event.slug.match?(/\A[a-z0-9]+(?:-[a-z0-9]+)*\z/) && (@slug_ids ? @slug_ids[@event.slug] == @event.id : !Event.where(slug: @event.slug).where.not(id: @event.id).exists?)
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

  def stale_references
    return [] unless year
    sourced = info_snapshot ? Asjjf::EventFacts.registration_fields(info_snapshot.parsed_summary).stringify_keys : {}
    content = TEXT_FIELDS.filter_map do |field|
      value = @event.public_send(field)
      # Early registration can legitimately open in the preceding calendar year.
      # Exempt only text still identical to its saved ASJJF evidence.
      next if sourced.key?(field) && value.as_json == sourced[field].as_json
      # Reworded fee tables are exempt when every amount, deadline and option still
      # matches the saved ASJJF evidence.
      next if field == "registration_fee_sections" && info_snapshot && fees_match_evidence?(value)
      [ field.humanize, text_section(field), value.to_json ]
    end
    { event_schedule_items: %w[time description], prize_categories: %w[name], event_accommodations: %w[hotel_name description rate_info inclusions room_types booking_code booking_url] }.each do |association, fields|
      section = { event_schedule_items: "schedule", prize_categories: "prizes", event_accommodations: "hotels" }.fetch(association)
      content.concat(@event.public_send(association).reject(&:marked_for_destruction?).map do |row|
        [ association.to_s.humanize, section, row.attributes.slice(*fields).values.join(" ") ]
      end)
    end
    content.filter_map do |label, section, text|
      years = text.scan(/\b20\d{2}\b/).uniq.reject { |value| value.to_i == year }
      { label: label, section: section, years: years } if years.any?
    end
  end

  def fees_match_evidence?(sections)
    evidence = Array(info_snapshot.parsed_summary["fees"]).map do |fee|
      [ fee_group(fee["group"]), fee_amount(fee["amount"].presence || fee["fee_text"]), fee_date(fee["until"]), fee_option(fee["division"]) ]
    end
    ours = Array(sections).flat_map do |section|
      Array(section["rows"] || section[:rows]).map do |row|
        row = row.stringify_keys
        [ fee_group(section["title"] || section[:title]), fee_amount(row["fee"]), fee_date(row["deadline"].to_s.sub(/\Auntil\s+/i, "")), fee_option(row["option"]) ]
      end
    end
    ours.any? && ours.none? { |row| row.any?(&:nil?) } && ours.sort_by(&:to_s) == evidence.sort_by(&:to_s)
  end

  def fee_group(title)
    title.to_s.downcase[/\b(kid|adult|master|junior|teen)/, 1] || title.to_s.downcase.squish
  end

  def fee_amount(value)
    digits = value.to_s.delete(",")[/\d+(?:\.\d+)?/]
    digits && BigDecimal(digits).to_s("F").sub(/\.0\z/, "")
  end

  def fee_date(value)
    Date.parse(value.to_s).iso8601
  rescue Date::Error
    nil
  end

  def fee_option(value)
    value.to_s.downcase.squish
  end

  def text_section(field)
    case field
    when /\Aregistration/ then "dates"
    when /\Aticket/ then "tickets"
    when /\A(travel|visa|venue|city|country)/ then "venue"
    when /\Aschedule/ then "schedule"
    when /\Aprize/ then "prizes"
    else "basics"
    end
  end

  def stars_sourced?
    return true if @event.asjjf_stars.nil?
    return false if @event.asjjf_info_snapshot_id.blank? || @event.asjjf_info_id.blank?
    stars = info_snapshot&.parsed_summary&.fetch("stars", nil)
    stars.present? && stars.to_i == @event.asjjf_stars
  end

  def info_snapshot
    return @info_snapshot if defined?(@info_snapshot)
    return @info_snapshot = @snapshots[[ @event.asjjf_info_snapshot_id, @event.asjjf_info_id ]] if @snapshots
    @info_snapshot = AsjjfSnapshot.find_by(id: @event.asjjf_info_snapshot_id, page_type: "event_info", parse_status: "parsed", outcome: "ok", asjjf_id: @event.asjjf_info_id) if @event.asjjf_info_snapshot_id.present? && @event.asjjf_info_id.present?
  end

  def check(key, label, complete, section)
    { key: key, label: label, complete: !!complete, blocking: true, section: section }
  end
end
