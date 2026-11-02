module Asjjf
  class ResultsAssembler
    attr_reader :rows, :missing, :guard_failures, :snapshot_ids, :evidence, :expected_pages

    def initialize(event)
      @event = event
      @rows, @missing, @guard_failures, @snapshot_ids, @evidence, @expected_pages = [], [], [], [], [], []
    end

    def call
      sources = FetchPlanner.new.sources_for(@event)
      @missing << "No ASJJF sources configured" if sources.empty?
      sources.each { |source| assemble_source(source) }
      self
    end

    def complete?
      missing.empty?
    end

    private

    def assemble_source(source)
      snapshots = AsjjfSnapshot.where(asjjf_id: source.asjjf_event_id, page_type: %w[event_results results_list])
        .order(fetched_at: :desc, id: :desc).to_a
      pages = [ [ "event_results", nil, nil ] ] + %w[MALE FEMALE].product(%w[ADULT KIDS]).map { |gender, age| [ "results_list", gender, age ] }
      selected = pages.filter_map do |type, gender, age|
        @expected_pages << [ source.asjjf_event_id, type, gender, age ]
        label = "#{source.asjjf_event_id}: #{type} #{[ gender, age ].compact.join(' ')}".strip
        snapshot = snapshots.find { |item| matches?(item, type, gender, age) }
        pending = AsjjfFetchRequest.where(page_type: type, status: %w[pending leased blocked failed]).where("created_at > ?", snapshot&.created_at || Time.at(0)).any? do |request|
          matches?(request, type, gender, age, id: source.asjjf_event_id)
        end
        if snapshot.nil? || snapshot.outcome != "ok" || snapshot.parse_status != "parsed" || pending
          reason = pending ? "fetch pending or unsuccessful" : snapshot ? "#{snapshot.outcome}/#{snapshot.parse_status}" : "missing"
          @missing << "#{label} (#{reason})"
          next
        end
        @snapshot_ids << snapshot.id
        @evidence << snapshot.attributes.slice("id", "updated_at", "parsed_summary", "outcome", "parse_status")
        snapshot
      end
      return unless selected.length == 5

      event_page = selected.first.parsed_summary
      if source.discipline == "unknown"
        discipline = event_page["discipline"]
        source.update!(discipline: discipline) if %w[gi nogi].include?(discipline)
      end
      unless %w[gi nogi].include?(source.discipline)
        @guard_failures << "Source #{source.asjjf_event_id}: discipline is still unknown"
        return
      end
      selected.each do |snapshot|
        parsed = snapshot.parsed_summary
        if parsed["discipline"] != source.discipline
          @guard_failures << "Source #{source.asjjf_event_id}: page discipline disagrees with configured source"
        end
      end
      categories = selected.drop(1).map(&:parsed_summary)
      duplicate = categories.find { |page| page["category"] == event_page["category"] }
      if duplicate.nil? || canonical_divisions(duplicate) != canonical_divisions(event_page)
        @guard_failures << "Source #{source.asjjf_event_id}: event results and category page disagree"
      end
      categories.each do |page|
        Array(page["divisions"]).each do |division|
          Array(division["placements"]).each do |placement|
            @rows << ResultsIdentity.attributes(division, placement, source)
          end
        rescue Parsers::ParseError, KeyError => e
          @guard_failures << "Source #{source.asjjf_event_id}: unparseable division (#{e.message})"
        end
      end
    end

    def canonical_divisions(page)
      Array(page["divisions"]).map do |division|
        [ ResultsIdentity.division_key(division["name"]), division["alone_in_bracket"],
          Array(division["placements"]).map { |p| [ p["position"], p["name"], p["academy"], p["country"] ] }.sort_by(&:to_s) ]
      end.sort_by(&:to_s)
    end

    def matches?(item, type, gender, age, id: nil)
      return false if item.page_type != type
      uri = Url.parse(item.url, page_type: type)
      return false if id && uri.path.split("/").last.to_i != id
      return true if type == "event_results"
      query = URI.decode_www_form(uri.query.to_s).to_h
      query["gender"] == gender && query["age"] == age
    rescue ArgumentError
      false
    end
  end
end
