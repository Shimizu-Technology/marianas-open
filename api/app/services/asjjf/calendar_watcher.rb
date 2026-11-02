require "digest"

module Asjjf
  class CalendarWatcher
    # ASJJF's calendar uses sporting names for some places; the series and site use these.
    COUNTRY_LABELS = { "chinese taipei" => "Taiwan" }.freeze

    # Serialize calendar runs and decisions, including jobs for different seasons.
    def self.synchronize(&block)
      AsjjfCalendarRun.transaction do
        AsjjfCalendarRun.connection.execute("SELECT pg_advisory_xact_lock(184527006)")
        yield
      end
    end

    def self.event_ids(event)
      ids = Array(event.asjjf_event_ids) + event.event_asjjf_sources.map(&:asjjf_event_id) + [ event.asjjf_info_id ]
      Event::ASJJF_REGISTRATION_URL_FIELDS.each do |field|
        uri = Url.parse(event.public_send(field), page_type: "event_info")
        ids << uri.path.split("/").last.to_i
      rescue ArgumentError
        next
      end
      ids.compact.map(&:to_i).select(&:positive?).uniq.sort
    end

    def self.base_name(value)
      value.to_s.sub(/\s*\(\s*(?:no\s*-?\s*gi|gi)(?:\s+(?:tournament|event))?\s*\)\s*\z/i, "").strip
    end

    def self.name_key(value)
      base_name(value).downcase.scan(/[[:alnum:]]+/).reject { |word| word.match?(/\A20\d{2}\z/) }.sort.join(" ")
    end

    def initialize(snapshot)
      @snapshot = snapshot
      @created_reviews = []
    end

    def call
      return unless @snapshot.page_type == "season_calendar" && @snapshot.outcome == "ok" && @snapshot.parse_status == "parsed"
      run = self.class.synchronize do
        @snapshot.reload
        next if AsjjfCalendarRun.exists?(snapshot_id: @snapshot.id)
        latest = AsjjfSnapshot.where(page_type: "season_calendar", asjjf_id: @snapshot.asjjf_id).order(fetched_at: :desc, id: :desc).first
        next unless latest&.id == @snapshot.id
        @organization = Organization.find_by!(slug: "marianas-open")
        @events = @organization.events.includes(:event_asjjf_sources).to_a
        summary = @snapshot.parsed_summary.deep_symbolize_keys
        @year = Array(summary[:seasons]).find { |season| season[:id] == @snapshot.asjjf_id }&.fetch(:year)
        @year ||= PlanAsjjfCalendarJob::KNOWN_SEASONS.key(@snapshot.asjjf_id)
        raise ArgumentError, "Calendar season year is not published" unless @year
        # Past seasons are kept as reference evidence only. Fetching or uploading an
        # old calendar (for example to look up a historical event ID) must never
        # create drafts, change events or raise review items.
        next if @year < Time.current.in_time_zone("Pacific/Guam").year - 1
        all_rows = summary.fetch(:events)
        selected = Parsers::SeasonCalendar.select_marianas(all_rows)
        @present_ids = all_rows.map { |row| row.fetch(:event_id) }
        @active_review_ids = []
        @matched_event_ids = []
        # Resolve existing identity across the entire calendar before processing
        # title groups. A partial rename must never split one saved event's facts.
        owners = Hash.new { |hash, key| hash[key] = [] }
        all_rows.group_by { |row| self.class.name_key(row.fetch(:title)) }.each do |key, rows|
          matching_events(rows).each { |event| owners[event.id] << key }
        end
        @colliding_event_ids = owners.select { |_id, keys| keys.uniq.size > 1 }.keys
        selected.group_by { |row| self.class.name_key(row.fetch(:title)) }.each_value { |rows| apply_group(rows) }
        flag_missing
        # Every warning/proposal must be revalidated by this season's latest run.
        # New-draft notices remain until staff review, dismiss or publish them.
        AsjjfCalendarReview.joins(:snapshot).where(kind: %w[change missing ambiguous], status: "pending",
          asjjf_snapshots: { page_type: "season_calendar", asjjf_id: @snapshot.asjjf_id })
          .where.not(id: @active_review_ids).update_all(status: "superseded", updated_at: Time.current)
        AsjjfCalendarRun.create!(snapshot: @snapshot, season_id: @snapshot.asjjf_id, season_year: @year,
          summary: { new_drafts: @created_reviews.count { |review| review.kind == "new_draft" },
            pending_changes: @created_reviews.count { |review| review.kind.in?(%w[change missing ambiguous]) },
            updated_drafts: @created_reviews.count { |review| review.kind == "draft_update" } })
      end
      CalendarAlert.deliver(run, @created_reviews) if run && @created_reviews.any?
      run
    end

    private

    def apply_group(rows)
      title = self.class.base_name(rows.first.fetch(:title))
      ids = rows.map { |row| row.fetch(:event_id) }.sort
      # Pair disciplines only when the source agrees on dates and place.
      consistent = rows.map { |row| row[:place] }.uniq.one? &&
        rows.map { |row| row.fetch(:event_date) }.max <= rows.map { |row| row.fetch(:event_end_date) }.min &&
        rows.group_by { |row| row[:discipline] }.values.all?(&:one?)
      matches = matching_events(rows)
      unless consistent && matches.size <= 1 && (matches.map(&:id) & @colliding_event_ids).empty?
        review(kind: "ambiguous", title: title, event: matches.one? ? matches.first : nil,
          new_values: { "message" => "ASJJF entries do not identify one event with matching titles, dates and place. Review the source manually.", "asjjf_event_ids" => ids })
        return
      end
      event = matches.first
      @matched_event_ids << event.id if event
      # Remaining rows cannot establish the saved event's complete date range.
      # Keep its facts and let flag_missing create a manual review warning.
      return if event && (self.class.event_ids(event) - @present_ids).any?
      facts = facts_for(rows)
      if event.nil?
        event = @organization.events.create!(facts.merge(name: title, slug: draft_slug(title, ids.first), status: "draft",
          season_year: Date.iso8601(facts.fetch("date")).year, content_review_required: true,
          is_main_event: false, asjjf_calendar_snapshot_id: @snapshot.id))
        @events << event
        review(kind: "new_draft", title: title, event: event, new_values: facts)
      else
        event.with_lock do
          # Disappearing source IDs are retained and flagged below, never removed.
          facts["asjjf_event_ids"] = (self.class.event_ids(event) + ids).uniq.sort
          diff = facts.reject { |key, value| equivalent?(event, key, value, facts) }
          if event.status == "draft" && event.asjjf_calendar_snapshot_id.present?
            if diff.any?
              old_values = event.attributes.slice(*diff.keys).as_json
              event.update!(facts.merge(asjjf_calendar_snapshot_id: @snapshot.id))
              review(kind: "draft_update", title: event.name, event: event, old_values: old_values, new_values: diff)
            end
          elsif diff.any?
            review(kind: "change", title: event.name, event: event,
              old_values: event.attributes.slice(*diff.keys).as_json, new_values: diff)
          end
        end
      end
    end

    def matching_events(rows)
      ids = rows.map { |row| row.fetch(:event_id) }
      by_id = @events.select { |event| (self.class.event_ids(event) & ids).any? }
      by_id.presence || @events.select do |event|
        self.class.name_key(event.name) == self.class.name_key(rows.first.fetch(:title)) &&
          event.date&.iso8601 == rows.map { |row| row[:event_date] }.min &&
          (event.end_date || event.date)&.iso8601 == rows.map { |row| row[:event_end_date] }.max
      end
    end

    def equivalent?(event, key, value, facts)
      current = event.public_send(key).as_json
      return Array(current).map(&:to_i).sort == value if key == "asjjf_event_ids"
      # A one-day source range and a blank end date mean the same thing.
      return (event.end_date&.iso8601 || facts["date"]) == (value || facts["date"]) if key == "end_date"
      current == value
    end

    def facts_for(rows)
      row = rows.first
      start_date = Date.iso8601(rows.map { |entry| entry.fetch(:event_date) }.min)
      end_date = Date.iso8601(rows.map { |entry| entry.fetch(:event_end_date) }.max)
      raise ArgumentError, "Invalid calendar date range" if end_date < start_date
      facts = { "date" => start_date.iso8601, "end_date" => end_date == start_date ? nil : end_date.iso8601,
        "asjjf_event_ids" => rows.map { |entry| entry.fetch(:event_id) }.sort }
      # Calendar place is a published label, not a structured street address or city.
      venue, country = row[:place].to_s.split(/\s+-\s+(?=[^-]+\z)/, 2)
      facts["venue_name"] = venue if venue.present?
      facts["country"] = COUNTRY_LABELS.fetch(country.strip.downcase, country) if country.present?
      rows.each do |entry|
        key = { "gi" => "registration_url_gi", "nogi" => "registration_url_nogi" }[entry[:discipline]] || "registration_url"
        facts[key] = entry.fetch(:url)
      end
      opens = rows.filter_map { |entry| entry[:registration_start_date] }.min
      facts["registration_opens_on"] = opens if opens
      facts
    end

    def flag_missing
      @events.each do |event|
        next unless (event.season_year || event.date&.year) == @year || @matched_event_ids.include?(event.id)
        missing = self.class.event_ids(event) - @present_ids
        if missing.any?
          review(kind: "missing", title: event.name, event: event,
            new_values: { "message" => "ASJJF no longer lists these event IDs on this season calendar. The event is still saved with its current publication status.", "asjjf_event_ids" => missing })
        end
      end
    end

    def review(kind:, title:, event: nil, old_values: {}, new_values: {})
      fingerprint = Digest::SHA256.hexdigest([ kind, event&.id, self.class.name_key(title), old_values.sort, new_values.sort,
        (kind == "draft_update" ? @snapshot.id : nil) ].to_json)
      existing = AsjjfCalendarReview.find_by(fingerprint: fingerprint)
      if existing
        @active_review_ids << existing.id
        if existing.status.in?(%w[superseded applied])
          existing.update!(snapshot: @snapshot, status: "pending", reviewed_at: nil)
          @created_reviews << existing
        end
        return existing
      end
      item = AsjjfCalendarReview.create!(snapshot: @snapshot, event: event, kind: kind, title: title,
        old_values: old_values, new_values: new_values, fingerprint: fingerprint, status: kind == "draft_update" ? "applied" : "pending")
      @created_reviews << item
      @active_review_ids << item.id
      item
    end

    def draft_slug(title, id)
      slug = title.parameterize.presence || "asjjf-event"
      Event.exists?(slug: slug) ? "#{slug}-asjjf-#{id}" : slug
    end
  end
end
