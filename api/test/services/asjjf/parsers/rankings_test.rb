require_relative "parser_test_helper"

class AsjjfRankingsTest < AsjjfParserTest
  def test_team_ranking_full_count_and_exact_leader
    parsed = parse_fixture("team_rank_227.html")
    assert_equal "Marianas Pro Jiu Jitsu Ranking 2026", parsed[:title]
    assert_equal "Adults Team Ranking", parsed[:category]
    assert_equal "gi", parsed[:discipline]
    assert_equal 227, parsed[:ranking_id]
    assert_equal({ rows: 217 }, parsed[:counts])
    assert_equal({ position: 1, name: "Biba Jiu Jitsu", points: BigDecimal("5351.00"), team_id: 91038,
                   url: "https://asjjf.org/ranking/teamRankDetails/91038" }, parsed[:rows].first)
    assert_equal 2867, parsed[:rows][1][:points]
    assert parsed[:rows].all? { |row| row[:points].is_a?(BigDecimal) }
  end

  def test_individual_index_division_inventory_and_default_table
    parsed = parse_fixture("individual_ranking_227.html")
    assert_equal({ divisions: 85, rows: 39 }, parsed[:counts])
    assert_equal "gi", parsed[:discipline]
    division = parsed[:divisions].find { |row| row[:id] == 20401 }
    assert_equal({ id: 20401, name: "Male White Adult 18", gender: "male", age: "Adult 18", belt: "white",
                   url: "https://asjjf.org/ranking/individualRankingDivision/20401" }, division)
    assert_equal "Male Black Adult 18", parsed[:default_division][:name]
    assert_equal "black", parsed[:default_division][:belt]
    assert_equal 39, parsed[:rows].length
    assert_equal BigDecimal("187.00"), parsed[:rows].first[:points]
    assert_equal [ 3, 0, 0 ], parsed[:rows].first.values_at(:gold, :silver, :bronze)
    assert parsed[:divisions].any? { |row| row[:age] == "KID 4" && row[:gender] == "female" }
  end

  def test_no_gi_index_has_its_own_divisions_and_default_rows
    parsed = parse_fixture("individual_ranking_234_nogi.html")
    assert_equal "Marianas Pro No-gi Ranking 2026", parsed[:title]
    assert_equal "nogi", parsed[:discipline]
    assert_equal 234, parsed[:ranking_id]
    assert_equal({ divisions: 57, rows: 10 }, parsed[:counts])
    assert_equal "Male Black Adult 18", parsed[:default_division][:name]
  end

  def test_individual_division_all_158_rows_and_member_facts
    parsed = parse_fixture("individual_ranking_division_20401_get.html")
    assert_equal 20401, parsed[:division_id]
    assert_equal({ name: "Male White Adult 18", gender: "male", belt: "white", age: "Adult 18" }, parsed[:division])
    assert_equal({ rows: 158 }, parsed[:counts])
    assert_equal({ position: 1, member_id: 1297991, url: "https://asjjf.org/ranking/rankMemberDetails/1297991?pos=1",
                   name: "Jasper Alpet", academy: "Guam Martial Arts Academy", country: "FSM",
                   points: BigDecimal("176.00"), gold: 3, silver: 0, bronze: 0 }, parsed[:rows].first)
    assert parsed[:rows].any? { |row| row[:academy] == "Deftac Six Blades Jiu-jitsu" }
    # Ties are source facts. Never deduplicate positions or athletes by names.
    assert_operator parsed[:rows].group_by { |row| row[:position] }.values.count { |group| group.length > 1 }, :>, 0
    assert_equal 158, parsed[:rows].map { |row| row[:member_id] }.uniq.length
  end

  def test_decimal_points_are_not_truncated_or_rounded
    [ "team_rank_227.html", "individual_ranking_division_20401_get.html" ].each do |file|
      html = mutate(file) { |doc| doc.at_css("#listTable tbody tr").css("td")[3].content = "1,234.75" }
      assert_equal BigDecimal("1234.75"), parse_fixture(file, html: html)[:rows].first[:points]
    end
  end

  def test_exact_member_names_punctuation_unicode_and_countries
    file = "individual_ranking_division_20401_get.html"
    html = mutate(file) { |doc| doc.at_css("td.capitalize strong a").content = "Jean-Luc D’Ángelo 李" }
    assert_equal "Jean-Luc D’Ángelo 李", parse_fixture(file, html: html)[:rows].first[:name]
  end

  def test_invalid_points_medals_and_missing_member_fields_fail_closed
    file = "individual_ranking_division_20401_get.html"
    [ ->(doc) { doc.at_css("tbody tr").css("td")[3].content = "176 points" },
      ->(doc) { doc.at_css("tbody tr").css("td")[4].content = "1.5" },
      ->(doc) { doc.at_css("tbody tr").css("td")[0].content = "-1" },
      ->(doc) { doc.at_css("tbody tr").css("td")[2].content = "Jasper Alpet" },
      ->(doc) { doc.at_css("thead th").content = "Something else" },
      ->(doc) { doc.at_css("tbody").children.remove }
    ].each do |change|
      assert_raises(PARSERS::ParseError) { parse_fixture(file, html: mutate(file, &change)) }
    end
  end

  def test_wrong_ranking_kind_cannot_be_misread_as_valid
    file = "individual_ranking_227.html"
    assert_raises(PARSERS::ParseError) do
      parse_fixture(file, page_type: :team_ranking, url: "https://asjjf.org/ranking/teamRank/227")
    end
    assert_raises(PARSERS::ParseError) do
      parse_fixture(file, page_type: :individual_ranking_division, url: "https://asjjf.org/ranking/individualRankingDivision/20401")
    end
    file = "individual_ranking_division_20401_get.html"
    assert_raises(PARSERS::ParseError) do
      parse_fixture(file, page_type: :individual_ranking, url: "https://asjjf.org/ranking/individualRanking/227")
    end
  end

  def test_bad_index_divisions_and_duplicate_ids_fail_closed
    file = "individual_ranking_227.html"
    html = mutate(file) { |doc| doc.at_css("#right-menu small").content = "Unknown division" }
    assert_raises(PARSERS::ParseError) { parse_fixture(file, html: html) }
    html = mutate(file) do |doc|
      links = doc.css('#right-menu a[href*="individualRankingDivision"]')
      links[1]["href"] = links[0]["href"]
    end
    assert_raises(PARSERS::ParseError) { parse_fixture(file, html: html) }
  end
end

class AsjjfRankingRejectionTest < AsjjfParserTest
  def test_invalid_thousands_grouping_nonfinite_and_negative_points_are_rejected
    file = "team_rank_227.html"
    [ "1,2,3.50", "-1.50", "NaN", "Infinity", "1.2.3" ].each do |value|
      html = mutate(file) { |doc| doc.at_css("tbody tr").css("td")[3].content = value }
      assert_raises(PARSERS::ParseError, value) { parse_fixture(file, html: html) }
    end
  end

  def test_zero_positions_are_rejected_but_zero_medals_are_preserved
    file = "individual_ranking_division_20401_get.html"
    html = mutate(file) { |doc| doc.at_css("tbody tr td").content = "0" }
    assert_raises(PARSERS::ParseError) { parse_fixture(file, html: html) }
    assert_equal 0, parse_fixture(file)[:rows].first[:silver]
  end
end
