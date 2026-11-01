require_relative "parser_test_helper"

class AsjjfEventResultsTest < AsjjfParserTest
  def test_all_real_result_counts
    {
      "event_results_2062_gi.html" => [ 93, 246, 16 ],
      "event_results_2063_nogi.html" => [ 39, 100, 8 ],
      "results_list_2062_female_adult.html" => [ 36, 77, 11 ],
      "results_list_2062_male_kids.html" => [ 48, 121, 9 ]
    }.each do |file, (divisions, placements, alone)|
      parsed = parse_fixture(file)
      assert_equal({ divisions: divisions, placements: placements, alone_in_bracket: alone }, parsed[:counts], file)
      assert_equal divisions, parsed[:divisions].length
      assert_equal placements, parsed[:divisions].sum { |division| division[:placements].length }
      parsed[:divisions].each do |division|
        assert_equal division[:placements].one?, division[:alone_in_bracket]
        assert division[:placements].all? { |row| row.keys == %i[position name academy country] }
      end
    end
  end

  def test_exact_title_and_source_category
    parsed = parse_fixture("event_results_2062_gi.html")
    assert_equal "2026 Marianas Open International Championship (gi Tournament)", parsed[:title]
    assert_equal "Male Adult", parsed[:category]
    assert_equal "gi", parsed[:discipline]
    assert_equal 2062, parsed[:event_id]
    assert_equal "nogi", parse_fixture("event_results_2063_nogi.html")[:discipline]
  end

  def test_female_adult_and_open_weight_regression
    parsed = parse_fixture("results_list_2062_female_adult.html")
    division = parsed[:divisions].find { |row| row[:name] == "Female Blue Adult 18 Open Weight" }
    assert_equal({ gender: "female", belt: "blue", age: "Adult 18", weight: "Open Weight" }, division.slice(:gender, :belt, :age, :weight))
    assert_equal [ 1, 2, 3, 3 ], division[:placements].map { |row| row[:position] }
    assert_equal({ position: 1, name: "Adamos T’ana", academy: "Biba Jiu Jitsu", country: "GUM" }, division[:placements].first)
    refute division[:alone_in_bracket]
  end

  def test_reordered_female_adult_belt_name
    file = "results_list_2062_female_adult.html"
    html = fixture(file).sub("Female Blue Adult 18 Open Weight", "Female Adult 18 Blue Open Weight")
    row = parse_fixture(file, html: html)[:divisions].find { |division| division[:name] == "Female Adult 18 Blue Open Weight" }
    assert_equal [ "female", "blue", "Adult 18", "Open Weight" ], row.values_at(:gender, :belt, :age, :weight)
  end

  def test_kid_four_and_multiword_weights
    row = parse_fixture("results_list_2062_male_kids.html")[:divisions].find { |division| division[:name] == "Male Gray Kid 4 Light Feather" }
    assert_equal [ "male", "gray", "Kid 4", "Light Feather" ], row.values_at(:gender, :belt, :age, :weight)
    assert_equal "Juvenile 16-17", parse_fixture("event_results_2062_gi.html")[:divisions].first[:age]
  end

  def test_names_and_hyphens_are_not_identity_normalized
    parsed = parse_fixture("event_results_2062_gi.html")
    first = parsed[:divisions].first[:placements].first
    assert_equal({ position: 1, name: "Pascual Jarelle", academy: "Guam Martial Arts Academy", country: "USA" }, first)
    assert parsed[:divisions].flat_map { |d| d[:placements] }.any? { |row| row[:academy] == "Deftac Six Blades Jiu-jitsu" }
  end

  def test_html_entities_and_unicode_are_decoded_without_reordering
    file = "results_list_2062_female_adult.html"
    html = fixture(file).sub("Adamos T’ana", "D’Ángelo Ana-María &amp; 李")
    names = parse_fixture(file, html: html)[:divisions].flat_map { |d| d[:placements] }.map { |row| row[:name] }
    assert_includes names, "D’Ángelo Ana-María & 李"
  end

  def test_both_entry_classes_and_dispatch_alias
    file = "event_results_2062_gi.html"
    options = { url: "https://asjjf.org/main/eventResults/2062" }
    expected = PARSERS::EventResults.new(fixture(file), **options).parse
    assert_equal expected, PARSERS::ResultsList.new(fixture(file), **options).parse
    assert_equal expected, parse_fixture(file, page_type: "results_list")
  end

  def test_missing_or_bad_rows_fail_the_entire_parse
    file = "event_results_2062_gi.html"
    [ ->(doc) { doc.at_css("tbody").remove },
      ->(doc) { doc.at_css("td.fighter-name").content = "" },
      ->(doc) { doc.at_css("tbody tr td").content = "9th" },
      ->(doc) { doc.at_css("h5").content = "Unknown division" },
      ->(doc) { doc.at_css("h5").content = "Male White Adult 18" },
      ->(doc) { doc.at_css("h5").content = "Female White Adult 18 Feather" }
    ].each do |change|
      assert_raises(PARSERS::ParseError) { parse_fixture(file, html: mutate(file, &change)) }
    end
  end

  def test_wrong_category_url_fails
    assert_raises(PARSERS::ParseError) do
      parse_fixture("results_list_2062_female_adult.html", url: "https://asjjf.org/main/resultsList/2062?gender=MALE&age=ADULT")
    end
    assert_raises(PARSERS::ParseError) do
      parse_fixture("results_list_2062_male_kids.html", url: "https://asjjf.org/main/resultsList/2062?gender=MALE&age=ADULT")
    end
  end

  def test_duplicate_and_empty_divisions_fail
    file = "event_results_2062_gi.html"
    assert_raises(PARSERS::ParseError) do
      parse_fixture(file, html: mutate(file) { |doc| doc.css("h5")[1].content = doc.at_css("h5").text })
    end
    assert_raises(PARSERS::ParseError) do
      parse_fixture(file, html: mutate(file) { |doc| doc.at_css("tbody").children.remove })
    end
  end
end
