module ResultsSnapshotFixtures
  def fixture_summary(file, type:, url:, full: false)
    parsed = Asjjf::Parsers.parse(page_type: type, url: url,
      html: File.read(Rails.root.join("test/fixtures/files/asjjf", file))).deep_stringify_keys
    parsed["divisions"] = parsed["divisions"].first(full.is_a?(Integer) ? full : 1) unless full == true
    parsed
  end

  def save_page(id:, type:, category: nil, summary: nil, **overrides)
    url = Asjjf::Url.build(type, id)
    url += "?gender=#{category.split.first.upcase}&age=#{category.split.last.upcase}" if category
    attrs = { url: url, asjjf_id: id, page_type: type, outcome: "ok", parse_status: "parsed",
      parsed_summary: summary, source: "admin_upload", fetched_at: Time.current, http_status: 200, html: "saved fixture evidence" }
    AsjjfSnapshot.create!(attrs.merge(overrides))
  end

  def complete_snapshots(event, id: 2062, discipline: "gi", full: false)
    event.event_asjjf_sources.find_or_create_by!(asjjf_event_id: id) { |source| source.discipline = discipline; source.derived_from = "admin" }
    file = discipline == "nogi" ? "event_results_2063_nogi.html" : "event_results_2062_gi.html"
    original = discipline == "nogi" ? 2063 : 2062
    main = fixture_summary(file, type: "event_results", url: Asjjf::Url.build("event_results", original), full: full)
    main["event_id"] = id
    saved = [ save_page(id: id, type: "event_results", summary: main) ]
    %w[MALE FEMALE].product(%w[ADULT KIDS]).each do |gender, age|
      category = "#{gender.capitalize} #{age.capitalize}"
      summary = main.deep_dup.merge("category" => category)
      summary["divisions"] = [] unless category == "Male Adult"
      if discipline == "gi" && %w[Female\ Adult Male\ Kids].include?(category)
        fixture = category == "Female Adult" ? "results_list_2062_female_adult.html" : "results_list_2062_male_kids.html"
        summary = fixture_summary(fixture, type: "results_list", url: "https://asjjf.org/main/resultsList/2062?gender=#{gender}&age=#{age}", full: full)
      end
      saved << save_page(id: id, type: "results_list", category: category, summary: summary)
    end
    saved
  end

  def sync(event, **options)
    Asjjf::ResultsSync.new(event).call(**options)
  end
end
