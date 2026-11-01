require_relative "parser_test_helper"

class AsjjfIntakeContractTest < AsjjfParserTest
  def test_dumau_host_is_accepted_by_the_same_parser
    html = fixture("event_results_2062_gi.html")
    parsed = PARSERS.parse(page_type: "event_results", html: html, url: "https://dumau.asjjf.org/main/eventResults/2062")
    assert_equal 93, parsed[:counts][:divisions]
  end

  def test_challenge_detector_accepts_all_public_snapshots
    PAGES.each_key { |file| refute PARSERS::ChallengeDetector.challenged?(fixture(file)), file }
  end

  def test_real_challenge_and_interactive_variants_are_detected
    assert PARSERS::ChallengeDetector.challenged?(fixture("cloudflare_challenge.html"))
    [ "<title>Attention Required! | Cloudflare</title>", '<form id="challenge-form"></form>',
      "<script>window._cf_chl_opt = {}</script>", "<p>Verify you are human</p>",
      "<title>Just a moment...</title>", "<p>Enable JavaScript and cookies to continue</p>",
      '<script src="/cdn-cgi/challenge-platform/h/g/orchestrate/chl_page/v1"></script>'
    ].each { |html| assert PARSERS::ChallengeDetector.challenged?(html), html }
  end

  def test_challenge_detector_does_not_reject_tournament_language_or_passive_js
    refute PARSERS::ChallengeDetector.challenged?("<h1>ASJJF Challenge League</h1><p>Rise to the challenge!</p>")
    refute PARSERS::ChallengeDetector.challenged?('<script src="/cdn-cgi/challenge-platform/scripts/jsd/main.js"></script>')
    refute PARSERS::ChallengeDetector.challenged?(nil)
  end

  def test_every_page_type_rejects_challenges_empty_and_unrelated_html
    PAGES.each do |file, (type, path)|
      [ "", " \n\t", nil, "<html><h1>Login</h1><p>Please sign in.</p></html>" ].each do |html|
        assert_raises(PARSERS::ParseError, "#{type}: #{html.inspect}") { parse_fixture(file, html: html) }
      end
      assert_raises(PARSERS::ChallengeError, type.to_s) do
        PARSERS.parse(page_type: type, html: fixture("cloudflare_challenge.html"), url: "https://asjjf.org/#{path}")
      end
    end
  end

  def test_wrong_fixture_types_fail_instead_of_successfully_parsing_empty
    representatives = PAGES.to_a.reject { |file, _| file.include?("2063") || file.include?("results_list") || file.include?("2233") || file.include?("2211") || file.include?("234") }
    representatives.each do |expected_file, (type, path)|
      representatives.each do |other_file, _|
        next if expected_file == other_file
        assert_raises(PARSERS::ParseError, "#{type} given #{other_file}") do
          PARSERS.parse(page_type: type, html: fixture(other_file), url: "https://asjjf.org/#{path}")
        end
      end
    end
  end

  def test_all_keys_are_symbols_and_input_is_not_mutated
    PAGES.each_key do |file|
      html = fixture(file).freeze
      before = Digest::SHA256.hexdigest(html)
      parsed = parse_fixture(file, html: html)
      assert_symbol_keys(parsed)
      assert_equal before, Digest::SHA256.hexdigest(html)
      assert_equal parsed, parse_fixture(file, html: html)
    end
  end

  def test_unknown_page_types_and_wrong_urls_fail
    file = "event_results_2062_gi.html"
    assert_raises(PARSERS::ParseError) { parse_fixture(file, page_type: :unknown) }
    [ "not a url", "https://example.com/main/eventResults/2062", "https://asjjf.org/login", "https://asjjf.org/main/eventInfo/2062", "https://asjjf.org/main/eventResults/0" ].each do |url|
      assert_raises(PARSERS::ParseError) { parse_fixture(file, url: url) }
    end
  end

  def test_missing_table_ending_is_rejected_even_if_nokogiri_recovers_it
    file = "individual_ranking_division_20401_get.html"
    html = fixture(file).sub(%r{</table>.*}m, "")
    assert_raises(PARSERS::ParseError) { parse_fixture(file, html: html) }
  end

  def test_parsers_do_not_load_rails_or_active_record
    # When invoked by Rails' runner those constants may already exist; our
    # documented standalone command proves they are never loaded by the parsers.
    skip "Rails runner preloaded application" if defined?(Rails)
    refute defined?(ActiveRecord)
    refute defined?(AsjjfScraper)
  end
end

class AsjjfChallengeOverlayTest < AsjjfParserTest
  def test_interactive_challenge_overlay_rejects_otherwise_valid_html
    file = "event_results_2062_gi.html"
    html = mutate(file) { |doc| doc.at_css("body").add_child('<div class="cf-turnstile"></div>') }
    assert_raises(PARSERS::ChallengeError) { parse_fixture(file, html: html) }
  end
end

class AsjjfFixtureProvenanceTest < AsjjfParserTest
  def test_all_thirteen_supplied_html_snapshots_are_present_and_unchanged
    require "json"
    manifest = JSON.parse(File.read(File.join(FIXTURES, "manifest.json"))).fetch("files")
    assert_equal 13, manifest.length
    assert_equal manifest.keys.sort, Dir[File.join(FIXTURES, "*.html")].map { |path| File.basename(path) }.sort
    manifest.each do |name, expected|
      bytes = File.binread(File.join(FIXTURES, name))
      assert_equal expected.fetch("bytes"), bytes.bytesize, name
      assert_equal expected.fetch("sha256"), Digest::SHA256.hexdigest(bytes), name
    end
  end
end
