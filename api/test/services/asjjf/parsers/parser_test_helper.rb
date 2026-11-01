# Intentionally Rails-free: these tests must never connect to an application DB.
require "minitest/autorun"
require "digest"
require_relative "../../../../app/services/asjjf/parsers"

class AsjjfParserTest < Minitest::Test
  PARSERS = Asjjf::Parsers
  FIXTURES = File.expand_path("../../../fixtures/files/asjjf", __dir__)
  PAGES = {
    "event_results_2062_gi.html" => [ :event_results, "main/eventResults/2062" ],
    "event_results_2063_nogi.html" => [ :event_results, "main/eventResults/2063" ],
    "results_list_2062_female_adult.html" => [ :results_list, "main/resultsList/2062?gender=FEMALE&age=ADULT" ],
    "results_list_2062_male_kids.html" => [ :results_list, "main/resultsList/2062?gender=MALE&age=KIDS" ],
    "event_info_2258_copa_gi.html" => [ :event_info, "main/eventInfo/2258" ],
    "event_info_2233_tokyo_gi.html" => [ :event_info, "main/eventInfo/2233" ],
    "event_info_2211_manila_gi.html" => [ :event_info, "main/eventInfo/2211" ],
    "season_calendar_381.html" => [ :season_calendar, "main/eventsBySeason/381" ],
    "team_rank_227.html" => [ :team_ranking, "ranking/teamRank/227" ],
    "individual_ranking_227.html" => [ :individual_ranking, "ranking/individualRanking/227" ],
    "individual_ranking_234_nogi.html" => [ :individual_ranking, "ranking/individualRanking/234" ],
    "individual_ranking_division_20401_get.html" => [ :individual_ranking_division, "ranking/individualRankingDivision/20401" ]
  }.freeze

  def fixture(name)
    File.read(File.join(FIXTURES, name), encoding: "UTF-8")
  end

  def parse_fixture(name, html: fixture(name), **overrides)
    type, path = PAGES.fetch(name)
    PARSERS.parse(**{ page_type: type, html: html, url: "https://asjjf.org/#{path}" }.merge(overrides))
  end

  def mutate(name)
    doc = Nokogiri::HTML(fixture(name))
    yield doc
    doc.to_html
  end

  def assert_symbol_keys(value)
    case value
    when Hash
      assert value.keys.all? { |key| key.is_a?(Symbol) }
      value.each_value { |nested| assert_symbol_keys(nested) }
    when Array
      value.each { |nested| assert_symbol_keys(nested) }
    end
  end
end
