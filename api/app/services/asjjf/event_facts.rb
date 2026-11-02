module Asjjf
  class EventFacts
    def self.registration_fields(facts)
      {
        registration_fee_sections: Array(facts["fees"]).group_by { |fee| fee["group"] }.map do |group, fees|
          { title: group, rows: fees.map { |fee| { deadline: fee["date_text"], fee: fee["fee_text"], option: fee["division"] } } }
        end,
        registration_info_items: facts.fetch("dates").slice("registration_start", "registration_end", "correction_deadline").map do |label, value|
          { label: label.humanize, value: value }
        end
      }
    end

    def initialize(event, actor:)
      @event, @actor = event, actor
    end

    def call(value)
      id = parse_id(value)
      @event.with_lock do
        raise ArgumentError, "Unpublish this event before replacing its facts" unless @event.status == "draft"
        EvidenceLock.synchronize([ id ]) do
          snapshot = latest_snapshot(id)
          @event.assign_attributes(asjjf_info_id: id, asjjf_info_snapshot_id: nil, asjjf_stars: nil, asjjf_info_status: "pending")
          if snapshot
            apply_snapshot(snapshot)
          else
            @event.save!
            FetchPlanner.new(requested_by: @actor&.clerk_id).plan_event_info(@event, asjjf_id: id)
          end
          @event.event_audit_entries.create!(actor: @actor, actor_name: @actor&.full_name || "System", action: "asjjf_facts",
            metadata: { asjjf_event_id: id, snapshot_id: snapshot&.id, status: @event.asjjf_info_status })
        end
      end
      @event
    end

    # Links saved ASJJF evidence to an event whose public wording was entered by hand,
    # without replacing that wording. Dates must agree, and a set star rating must match.
    # This changes no public field, so published events can be verified in place.
    def verify(value)
      id = parse_id(value)
      @event.with_lock do
        EvidenceLock.synchronize([ id ]) do
          snapshot = latest_snapshot(id)
          raise ArgumentError, "No saved ASJJF event information page for #{id} yet. Queue a fetch or upload the page, then verify again." unless snapshot
          facts = snapshot.parsed_summary
          raise ArgumentError, "Saved ASJJF facts do not match the selected event ID" unless facts["event_id"].to_i == id
          dates = facts.fetch("dates")
          start_date = Date.iso8601(dates.fetch("event_start"))
          end_date = dates["event_end"].present? ? Date.iso8601(dates["event_end"]) : start_date
          unless @event.date == start_date && (@event.end_date || @event.date) == end_date
            raise ArgumentError, "ASJJF lists #{start_date.iso8601}#{end_date == start_date ? '' : " to #{end_date.iso8601}"}, which differs from this event's dates"
          end
          if @event.asjjf_stars.present? && @event.asjjf_stars != facts["stars"]&.to_i
            raise ArgumentError, "ASJJF lists #{facts['stars'].presence || 'no'} stars, which differs from this event's #{@event.asjjf_stars}"
          end
          @event.update!(asjjf_info_id: id, asjjf_info_snapshot_id: snapshot.id, asjjf_info_status: "verified")
          @event.event_audit_entries.create!(actor: @actor, actor_name: @actor&.full_name || "System", action: "asjjf_facts_verified",
            metadata: { asjjf_event_id: id, snapshot_id: snapshot.id })
        end
      end
      @event
    rescue KeyError, Date::Error
      raise ArgumentError, "Saved ASJJF snapshot is missing valid event dates; fetch a new event information page"
    end

    private

    def parse_id(value)
      raise ArgumentError, "ASJJF event ID must be a positive integer" unless value.to_s.match?(/\A[1-9]\d{0,9}\z/)
      value.to_i
    end

    def latest_snapshot(id)
      AsjjfSnapshot.where(asjjf_id: id, page_type: "event_info", outcome: "ok", parse_status: "parsed").order(fetched_at: :desc, id: :desc).first
    end

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
        **self.class.registration_fields(facts))
      @event.save!
    rescue KeyError, Date::Error
      raise ArgumentError, "Saved ASJJF snapshot is missing valid event facts; upload or fetch a new event information page"
    end
  end
end
