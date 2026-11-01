require_relative "parser_test_helper"

class AsjjfSeasonCalendarTest < AsjjfParserTest
  FILE = "season_calendar_381.html"

  def test_all_calendar_events_and_marianas_selection
    parsed = parse_fixture(FILE)
    assert_equal 381, parsed[:season_id]
    assert_equal({ events: 85 }, parsed[:counts])
    events = PARSERS::SeasonCalendar.select_marianas(parsed[:events])
    assert_equal [ 2258, 2259, 2233, 2234, 2211, 2212, 2235, 2236 ], events.map { |event| event[:event_id] }
    assert_equal 4, events.count { |event| event[:discipline] == "gi" }
    assert_equal 4, events.count { |event| event[:discipline] == "nogi" }
    assert_equal({ event_id: 2258, title: "2027 Guam Copa De Marianas (gi Tournament)",
                   url: "https://asjjf.org/main/eventInfo/2258", discipline: "gi", event_date: "2027-01-30",
                   event_end_date: "2027-01-30", event_date_text: "Saturday, January 30, 2027",
                   registration_start_date: "2026-10-31", registration_end_date: "2027-01-21",
                   place: "University of Guam Calvo Fieldhouse - Guam", banner_url: "https://files.asjjf.org/public/event_banners/2258/2555v0.png" }, events.first)
  end

  def test_multiday_event_and_exact_published_title
    event = parse_fixture(FILE)[:events].find { |row| row[:event_id] == 2211 }
    assert_equal "Guam Marianas Pro Manila 2027 ( Gi )", event[:title]
    assert_equal "2027-04-24", event[:event_date]
    assert_equal "2027-04-25", event[:event_end_date]
    assert_equal "Saturday, April 24, 2027 ~ Sunday, April 25, 2027", event[:event_date_text]
  end

  def test_external_registration_events_and_unpublished_dates_are_kept
    events = parse_fixture(FILE)[:events]
    external = events.select { |event| event[:url].start_with?("https://docs.google.com/") }
    assert_equal 6, external.length
    assert external.all? { |event| event[:event_id].positive? && event[:registration_start_date].nil? && event[:registration_end_date].nil? }
    row = external.find { |event| event[:event_id] == 2208 }
    assert_equal "Nagoya International Jiu Jitsu Teams Championship 2026 (5x5)", row[:title]
    assert_equal "Aichi Budokan - Japan", row[:place]
    # Preserve the source's 2026 title even though its actual date is in 2027.
    assert_equal "2027-01-09", row[:event_date]
    assert events.any? { |event| event[:discipline].nil? }
  end

  def test_selection_is_configurable_and_does_not_mutate_events
    events = parse_fixture(FILE)[:events]
    original = Marshal.dump(events)
    chosen = PARSERS::SeasonCalendar.select_marianas(events, pattern: /Tokyo/i, event_ids: [ 2258 ], exclude_ids: [ 2234 ])
    assert_includes chosen.map { |e| e[:event_id] }, 2258
    assert_includes chosen.map { |e| e[:event_id] }, 2233
    refute_includes chosen.map { |e| e[:event_id] }, 2234
    assert_equal [ 2211 ], PARSERS::SeasonCalendar.select_marianas(events, pattern: nil, event_ids: [ 2211 ]).map { |e| e[:event_id] }
    assert_equal original, Marshal.dump(events)
  end

  def test_dumau_open_selection_requires_guam_and_can_be_configured
    events = [
      { event_id: 1, title: "Dumau Open 2027", place: "University of Guam" },
      { event_id: 2, title: "Dumau Open 2027", place: "Tokyo Japan" },
      { event_id: 3, title: "Other Open", place: "Guam" }
    ]
    assert_equal [ 1 ], PARSERS::SeasonCalendar.select_marianas(events).map { |row| row[:event_id] }
    assert_equal [ 2 ], PARSERS::SeasonCalendar.select_marianas(events, place_pattern: /Japan/).map { |row| row[:event_id] }
    assert_empty PARSERS::SeasonCalendar.select_marianas(events, dumau_pattern: nil)
  end

  def test_missing_calendar_date_and_invalid_date_fail_closed
    html = mutate(FILE) { |doc| doc.at_css(".event-name").ancestors("a").first.css("strong").first.parent.next_element.content = "February 31, 2027" }
    assert_raises(PARSERS::ParseError) { parse_fixture(FILE, html: html) }
    html = mutate(FILE) { |doc| doc.at_css(".contents").children.remove }
    assert_raises(PARSERS::ParseError) { parse_fixture(FILE, html: html) }
  end

  def test_duplicate_event_ids_fail_closed
    html = mutate(FILE) { |doc| doc.css(".event-name")[1].ancestors("a").first["href"] = "https://asjjf.org/main/eventInfo/2221" }
    assert_raises(PARSERS::ParseError) { parse_fixture(FILE, html: html) }
  end
end

class AsjjfCalendarRejectionTest < AsjjfParserTest
  def test_mismatched_banner_and_event_ids_are_rejected
    file = "season_calendar_381.html"
    html = mutate(file) { |doc| doc.at_css(".event-name").ancestors("a").first.at_css("img")["src"] = "https://files.asjjf.org/public/event_banners/9999/banner.png" }
    assert_raises(PARSERS::ParseError) { parse_fixture(file, html: html) }
  end

  def test_executable_event_links_are_rejected
    file = "season_calendar_381.html"
    html = mutate(file) { |doc| doc.at_css(".event-name").ancestors("a").first["href"] = "javascript:alert(1)" }
    assert_raises(PARSERS::ParseError) { parse_fixture(file, html: html) }
  end
end
