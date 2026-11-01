require_relative "parser_test_helper"

class AsjjfEventInfoTest < AsjjfParserTest
  def test_copa_dates_registration_and_venue
    parsed = parse_fixture("event_info_2258_copa_gi.html")
    assert_equal 2258, parsed[:event_id]
    assert_equal "2027 Guam Copa De Marianas (gi Tournament)", parsed[:title]
    assert_equal "gi", parsed[:discipline]
    assert_equal({ event_start: "2027-01-30", event_end: "2027-01-30",
                   registration_start: "2026-10-31T00:00:00", registration_end: "2027-01-21T23:59:00",
                   correction_deadline: "2027-01-23T23:59:00" }, parsed[:dates])
    assert_equal "https://asjjf.org/main/eventNotice/2258", parsed[:registration_url]
    assert_equal "University Of Guam Calvo Fieldhouse", parsed[:venue][:name]
    assert_equal "303 University Dr, Mangilao, 96913, Guam Guam Guam", parsed[:venue][:address]
    assert_equal [ "303 University Dr, Mangilao, 96913,", "Guam Guam", "Guam" ], parsed[:venue][:address_lines]
    assert_match %r{https://www.google.com/maps/embed}, parsed[:venue][:map_url]
  end

  def test_copa_all_twelve_fees_and_currency
    parsed = parse_fixture("event_info_2258_copa_gi.html")
    assert_equal 3, parsed[:stars]
    assert_equal "USD", parsed[:currency]
    assert_equal 12, parsed[:counts][:fees]
    fees = parsed[:fees]
    assert_equal [ 55, 75, 95, 115 ], fees.select { |fee| fee[:group] == "Kids Prices" }.map { |fee| fee[:amount] }
    assert_equal [ 65, 85, 95, 115, 125, 145, 155, 175 ], fees.select { |fee| fee[:group] == "Adult Prices" }.map { |fee| fee[:amount] }
    assert_equal({ group: "Kids Prices", until: "2026-11-21T23:59:00", date_text: "Until November 21, 2026 11:59 PM",
                   amount: BigDecimal("55"), currency: "USD", currency_symbol: "$", fee_text: "$55", division: "Weight Division" }, fees.first)
    assert_equal "2027-01-21T23:59:00", fees.last[:until]
    assert_equal "Weight Division + Open Weight", fees.last[:division]
  end

  def test_copa_contact_spectator_and_every_narrative_deadline_are_retained
    parsed = parse_fixture("event_info_2258_copa_gi.html")
    assert_equal [ "moguam@marianasopen.com" ], parsed[:contact][:emails]
    assert parsed[:spectator_facts].any? { |fact| fact[:text].include?("tickets will be sold to spectators") }
    information = parsed[:information].map { |block| block[:text] }.join("\n")
    [ "Sunday, January 24, 2027", "Monday, January 25, 2027", "Chamoru Standard Time, ChST",
      "alone brackets/no opponent", "New correction requests will not be accepted.", "Håfa Adai!",
      "Teams Ranking points (3 Star):" ].each { |fact| assert_includes information, fact }
    assert parsed[:facts][:correction].any? { |fact| fact[:text].include?("Organizer’s correction day") }
    assert parsed[:facts][:fees].any? { |fact| fact[:text].include?("non-refundable") }
    assert_equal 114, parsed[:counts][:information_blocks]
  end

  def test_tokyo_dates_venue_fees_stars_and_spectator_facts
    parsed = parse_fixture("event_info_2233_tokyo_gi.html")
    assert_equal "2027-02-20", parsed[:dates][:event_start]
    assert_equal "2026-10-16T00:00:00", parsed[:dates][:registration_start]
    assert_equal "2027-02-10T23:59:00", parsed[:dates][:registration_end]
    assert_equal "2027-02-12T23:59:00", parsed[:dates][:correction_deadline]
    assert_equal "Komazawa Okunai Kyugijo (indoor Ball Court)", parsed[:venue][:name]
    assert_equal "Komazawa Koen 1-1 Setagaya Tokyo Japan", parsed[:venue][:address]
    assert_equal 4, parsed[:stars]
    assert_equal "JPY", parsed[:currency]
    assert_equal [ 8800, 9900, 10900, 11900, 8800, 11800, 9900, 12900, 10900, 13900, 11900, 14900 ], parsed[:fees].map { |fee| fee[:amount] }
    assert_equal "￥8,800", parsed[:fees].first[:fee_text]
    assert parsed[:spectator_facts].any? { |fact| fact[:text] == "General spectator admission is free at this championship. No admission fee will be charged." }
    assert_includes parsed[:contact][:emails], "support@asjjf.org"
    assert_includes parsed[:contact][:emails], "edisonbjj@gmail.com"
    assert_includes parsed[:contact][:phones], "0276-57-8045"
    assert_includes parsed[:contact][:phones], "+81 80-4109-5729"
    assert_equal 283, parsed[:counts][:information_blocks]
  end

  def test_manila_multiday_dates_and_no_invented_facts
    parsed = parse_fixture("event_info_2211_manila_gi.html")
    assert_equal "Guam Marianas Pro Manila 2027 ( Gi )", parsed[:title]
    assert_equal "2027-04-24", parsed[:dates][:event_start]
    assert_equal "2027-04-25", parsed[:dates][:event_end]
    assert_equal "2027-01-01T00:00:00", parsed[:dates][:registration_start]
    assert_equal "2027-01-29T23:59:00", parsed[:dates][:registration_end]
    assert_equal "2027-01-30T23:59:00", parsed[:dates][:correction_deadline]
    assert_equal "Gateway 2 Mall, Quantum Skyview Deck", parsed[:venue][:name]
    assert_includes parsed[:venue][:address], "Quezon City Metro Manila Philippines"
    assert_nil parsed[:stars]
    assert_nil parsed[:currency]
    assert_empty parsed[:fees]
    assert_empty parsed[:information]
    assert_empty parsed[:spectator_facts]
    assert_equal({ emails: [], phones: [] }, parsed[:contact])
  end

  def test_query_style_source_url_and_optional_registration_link
    file = "event_info_2258_copa_gi.html"
    parsed = parse_fixture(file, url: "https://asjjf.org/main/eventInfo?id=2258")
    assert_equal 2258, parsed[:event_id]
    html = mutate(file) { |doc| doc.css('a[href*="eventNotice"]').remove }
    assert_nil parse_fixture(file, html: html)[:registration_url]
  end

  def test_missing_date_or_venue_or_fee_fields_fail_closed
    file = "event_info_2258_copa_gi.html"
    [ "#eventDate", "#registrationDate", "#correctionDeadline", "#local", "#prices" ].each do |selector|
      html = mutate(file) { |doc| doc.at_css(selector).remove }
      assert_raises(PARSERS::ParseError) { parse_fixture(file, html: html) }
    end
    html = mutate(file) { |doc| doc.at_css("#prices td").content = "Until February 31, 2027 11:59 PM" }
    assert_raises(PARSERS::ParseError) { parse_fixture(file, html: html) }
    html = mutate(file) { |doc| doc.at_css("#registrationDate dd").content = "Start: TBD" }
    assert_raises(PARSERS::ParseError) { parse_fixture(file, html: html) }
  end

  def test_invalid_amounts_or_conflicting_stars_reject_the_page
    file = "event_info_2258_copa_gi.html"
    html = mutate(file) { |doc| doc.css("#prices td")[1].content = "$unknown" }
    assert_raises(PARSERS::ParseError) { parse_fixture(file, html: html) }
    html = mutate(file) { |doc| doc.at_css("#eventInfo").add_child("<p>4-STAR certified event</p>") }
    assert_raises(PARSERS::ParseError) { parse_fixture(file, html: html) }
  end

  def test_registration_url_event_id_must_match
    assert_raises(PARSERS::ParseError) do
      parse_fixture("event_info_2258_copa_gi.html", url: "https://asjjf.org/main/eventInfo/2233")
    end
  end

  def test_ambiguous_currency_is_not_assumed_to_be_us_dollars
    file = "event_info_2258_copa_gi.html"
    html = mutate(file) { |doc| doc.at_css("#local address").content = "Unknown country" }
    parsed = parse_fixture(file, html: html)
    assert_nil parsed[:currency]
    assert_equal "$", parsed[:fees].first[:currency_symbol]
    assert_nil parsed[:fees].first[:currency]
  end
end

class AsjjfEventInfoRejectionTest < AsjjfParserTest
  def test_partial_fee_dates_with_trailing_text_are_not_accepted
    file = "event_info_2258_copa_gi.html"
    html = mutate(file) { |doc| doc.at_css("#prices td").content = "Until November 21, 2026 11:59 PM or later" }
    assert_raises(PARSERS::ParseError) { parse_fixture(file, html: html) }
  end

  def test_decimal_fee_amounts_are_preserved
    file = "event_info_2258_copa_gi.html"
    html = mutate(file) { |doc| doc.css("#prices td")[1].content = "$55.75" }
    assert_equal BigDecimal("55.75"), parse_fixture(file, html: html)[:fees].first[:amount]
  end
end
