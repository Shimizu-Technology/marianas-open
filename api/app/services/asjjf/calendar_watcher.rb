require "digest"

module Asjjf
  class CalendarWatcher
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
        all_rows = summary.fetch(:events)
        selected = Parsers::SeasonCalendar.select_marianas(all_rows)
        @present_ids = all_rows.map { |row| row.fetch(:event_id) }
        @matched_event_ids = []
        selected.group_by { |row| self.class.name_key(row.fetch(:title)) }.each_value { |rows| apply_group(rows) }
        flag_missing
        AsjjfCalendarRun.create!(snapshot: @snapshot, season_id: @snapshot.asjjf_id, season_year: @year,
          summary: { new_drafts: @created_reviews.count { |review| review.kind == "new_draft" },
            pending_changes: @created_reviews.count { |review| review.kind != "new_draft" } })
      end
      CalendarAlert.deliver(run, @created_reviews) if run && @created_reviews.any?
      run
    end

    private

    def apply_group(rows)
      title = self.class.base_name(rows.first.fetch(:title))
      ids = rows.map { |row| row.fetch(:event_id) }.sort
      by_id = @events.select { |event| (self.class.event_ids(event) & ids).any? }
      # Pair disciplines only when the source agrees on dates and place.
      consistent = rows.map { |row| row[:place] }.uniq.one? &&
        rows.map { |row| row.fetch(:event_date) }.max <= rows.map { |row| row.fetch(:event_end_date) }.min &&
        rows.group_by { |row| row[:discipline] }.values.all?(&:one?)
      matches = by_id.presence || @events.select do |event|
        self.class.name_key(event.name) == self.class.name_key(title) && event.date&.iso8601 == rows.map { |row| row[:event_date] }.min &&
          (event.end_date || event.date)&.iso8601 == rows.map { |row| row[:event_end_date] }.max
      end
      unless consistent && matches.size <= 1
        AsjjfCalendarReview.where(event_id: matches.map(&:id), kind: "change", status: "pending").update_all(status: "superseded", updated_at: Time.current)
        review(kind: "ambiguous", title: title, new_values: { "message" => "ASJJF entries do not identify one event with matching dates and place. Review the source manually.", "asjjf_event_ids" => ids })
        return
      end
      @matched_event_ids.concat(matches.map(&:id))
      facts = facts_for(rows)
      event = matches.first
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
          diff = facts.reject { |key, value| equivalent?(event, key, value) }
          if event.status == "draft" && event.asjjf_calendar_snapshot_id.present?
            event.update!(facts.merge(asjjf_calendar_snapshot_id: @snapshot.id)) if diff.any?
          elsif diff.any?
            review(kind: "change", title: event.name, event: event,
              old_values: event.attributes.slice(*diff.keys).as_json, new_values: diff)
          end
          pending = AsjjfCalendarReview.where(event: event, kind: "change", status: "pending")
          pending.where.not(fingerprint: @active_fingerprint).update_all(status: "superseded", updated_at: Time.current)
          @active_fingerprint = nil
        end
      end
    end

    def equivalent?(event, key, value)
      current = event.public_send(key).as_json
      return Array(current).map(&:to_i).sort == value if key == "asjjf_event_ids"
      # A one-day source range and a blank end date mean the same thing.
      return (event.end_date || event.date)&.iso8601 == (value || event.date&.iso8601) if key == "end_date"
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
      facts["country"] = country if country.present?
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
        next unless (event.season_year || event.date&.year) == @year
        missing = self.class.event_ids(event) - @present_ids
        if missing.any?
          item = review(kind: "missing", title: event.name, event: event,
            new_values: { "message" => "ASJJF no longer lists these event IDs on this season calendar. The event is still saved with its current publication status.", "asjjf_event_ids" => missing })
          AsjjfCalendarReview.where(event: event, kind: "missing", status: "pending").where.not(id: item.id).update_all(status: "superseded", updated_at: Time.current)
          unless @matched_event_ids.include?(event.id)
            AsjjfCalendarReview.where(event: event, kind: "change", status: "pending").update_all(status: "superseded", updated_at: Time.current)
          end
        else
          AsjjfCalendarReview.where(event: event, kind: "missing", status: "pending").update_all(status: "superseded", updated_at: Time.current)
        end
      end
    end

    def review(kind:, title:, event: nil, old_values: {}, new_values: {})
      fingerprint = Digest::SHA256.hexdigest([ kind, event&.id, self.class.name_key(title), old_values.sort, new_values.sort ].to_json)
      @active_fingerprint = fingerprint if kind == "change"
      existing = AsjjfCalendarReview.find_by(fingerprint: fingerprint)
      if existing
        if existing.status.in?(%w[superseded applied])
          existing.update!(snapshot: @snapshot, status: "pending", reviewed_at: nil)
          @created_reviews << existing
        end
        return existing
      end
      item = AsjjfCalendarReview.create!(snapshot: @snapshot, event: event, kind: kind, title: title,
        old_values: old_values, new_values: new_values, fingerprint: fingerprint)
      @created_reviews << item
      item
    end

    def draft_slug(title, id)
      slug = title.parameterize.presence || "asjjf-event"
      Event.exists?(slug: slug) ? "#{slug}-asjjf-#{id}" : slug
    end
  end
end
