module Asjjf
  class EventFacts
    def initialize(event, actor:)
      @event, @actor = event, actor
    end

    def call(value)
      raise ArgumentError, "Unpublish this event before replacing its facts" unless @event.status == "draft"
      raise ArgumentError, "ASJJF event ID must be a positive integer" unless value.to_s.match?(/\A[1-9]\d{0,9}\z/)
      id = value.to_i
      @event.with_lock do
        EvidenceLock.synchronize([ id ]) do
          snapshot = AsjjfSnapshot.where(asjjf_id: id, page_type: "event_info", outcome: "ok", parse_status: "parsed").order(fetched_at: :desc, id: :desc).first
          @event.assign_attributes(asjjf_info_id: id, asjjf_info_snapshot_id: nil, asjjf_stars: nil, asjjf_info_status: "pending")
          @event.event_asjjf_sources.find_or_create_by!(asjjf_event_id: id) do |source|
            source.discipline = "unknown"
            source.derived_from = "admin"
          end
          if snapshot
            apply_snapshot(snapshot)
          else
            @event.save!
            FetchPlanner.new(requested_by: @actor&.clerk_id).plan_event_info(@event)
          end
          @event.event_audit_entries.create!(actor: @actor, actor_name: @actor&.full_name || "System", action: "asjjf_facts",
            metadata: { asjjf_event_id: id, snapshot_id: snapshot&.id, status: @event.asjjf_info_status })
        end
      end
      @event
    end

    private

    def apply_snapshot(snapshot)
      facts = snapshot.parsed_summary
      dates = facts.fetch("dates")
      start_date = Date.iso8601(dates.fetch("event_start"))
      year = @event.season_year || start_date.year
      raise ArgumentError, "Saved ASJJF dates belong to #{start_date.year}, not season #{year}" unless start_date.year == year
      raise ArgumentError, "Saved ASJJF facts do not match the selected event ID" unless facts["event_id"].to_i == @event.asjjf_info_id
      venue = facts.fetch("venue")
      @event.assign_attributes(date: start_date, end_date: dates["event_end"], season_year: year,
        venue_name: venue["name"], venue_address: venue["address"], asjjf_stars: facts["stars"],
        asjjf_info_snapshot_id: snapshot.id, asjjf_info_status: "applied",
        registration_url: Event.asjjf_event_info_url(facts["registration_url"]), registration_not_open: false,
        registration_fee_sections: Array(facts["fees"]).group_by { |fee| fee["group"] }.map do |group, fees|
          { title: group, rows: fees.map { |fee| { deadline: fee["date_text"], fee: fee["fee_text"], option: fee["division"] } } }
        end,
        registration_info_items: dates.slice("registration_start", "registration_end", "correction_deadline").map do |label, value|
          { label: label.humanize, value: value }
        end)
      @event.save!
    rescue KeyError, Date::Error
      raise ArgumentError, "Saved ASJJF snapshot is missing valid event facts; upload or fetch a new event information page"
    end
  end
end
