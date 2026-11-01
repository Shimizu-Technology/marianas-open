require_relative "parsers/base"
require_relative "parsers/event_results"
require_relative "parsers/results_list"
require_relative "parsers/event_info"
require_relative "parsers/season_calendar"
require_relative "parsers/team_ranking"
require_relative "parsers/individual_ranking"

module Asjjf
  module Parsers
    # Pure intake only: no network, Rails, database, identity normalization or imports.
    def self.parse(page_type:, html:, url:)
      parser = {
        "event_results" => EventResults,
        "results_list" => ResultsList,
        "event_info" => EventInfo,
        "season_calendar" => SeasonCalendar,
        "team_ranking" => TeamRanking,
        "individual_ranking" => IndividualRanking,
        "individual_ranking_division" => IndividualRankingDivision
      }.fetch(page_type.to_s) { raise ParseError, "Unsupported ASJJF page type: #{page_type}" }
      parser.new(html, url: url).parse
    end
  end
end
