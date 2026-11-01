module Asjjf
  class FetchPlanner
    def initialize(requested_by: nil)
      @requested_by = requested_by
    end

    def plan_event_results(event)
      sources_for(event).flat_map do |source|
        id = source.asjjf_event_id
        requests = [ enqueue("event_results", id, "event #{event.id} results") ]
        %w[MALE FEMALE].product(%w[ADULT KIDS]).each do |gender, age|
          requests << enqueue("results_list", id, "event #{event.id} #{gender} #{age} results", query: "gender=#{gender}&age=#{age}")
        end
        requests
      end
    end

    def plan_event_info(event)
      sources_for(event).map { |source| enqueue("event_info", source.asjjf_event_id, "event #{event.id} information") }
    end

    def plan_season_calendar(season_id)
      [ enqueue("season_calendar", season_id, "season calendar") ]
    end

    def plan_ranking(ranking_id, include_divisions: true)
      [ enqueue("individual_ranking", ranking_id, include_divisions ? "ranking with divisions" : "ranking index", include_divisions: include_divisions),
        enqueue("team_ranking", ranking_id, "team ranking"),
        enqueue("team_ranking", ranking_id, "kids team ranking", query: "rankType=kids") ]
    end

    private

    def enqueue(page_type, id, reason, query: nil, include_divisions: false)
      url = Url.build(page_type, id)
      url += "?#{query}" if query
      AsjjfFetchRequest.enqueue!(url: url, page_type: page_type, reason: reason, requested_by: @requested_by, include_divisions: include_divisions)
    end

    public

    def sources_for(event)
      # Also accommodate source ids edited after the one-time backfill.
      Array(event.asjjf_event_ids).each do |id|
        next unless id.to_s.match?(/\A[1-9]\d*\z/)
        event.event_asjjf_sources.find_or_create_by!(asjjf_event_id: id) do |source|
          source.discipline = "unknown"
          source.derived_from = "asjjf_event_ids"
        end
      end
      { registration_url_gi: "gi", registration_url_nogi: "nogi" }.each do |field, discipline|
        next if event.public_send(field).blank?
        uri = Url.parse(event.public_send(field), page_type: "event_info")
        source = event.event_asjjf_sources.find_or_initialize_by(asjjf_event_id: uri.path.split("/").last.to_i)
        next if source.persisted? && source.derived_from == "admin"
        source.update!(discipline: discipline, derived_from: "registration_url")
      rescue ArgumentError
        next
      end
      event.event_asjjf_sources.reload.to_a
    end
  end
end
