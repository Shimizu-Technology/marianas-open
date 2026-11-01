require "uri"

module Asjjf
  module Url
    PAGE_PATHS = {
      "event_results" => "/main/eventResults/", "results_list" => "/main/resultsList/",
      "event_info" => "/main/eventInfo/", "season_calendar" => "/main/eventsBySeason/",
      "team_ranking" => "/ranking/teamRank/", "individual_ranking" => "/ranking/individualRanking/",
      "individual_ranking_division" => "/ranking/individualRankingDivision/"
    }.freeze

    def self.parse(value, page_type: nil)
      uri = URI.parse(value.to_s)
      unless uri.scheme == "https" && %w[asjjf.org dumau.asjjf.org].include?(uri.host) &&
          uri.port == 443 && uri.userinfo.nil? && uri.fragment.nil?
        raise ArgumentError, "URL must use HTTPS on asjjf.org or dumau.asjjf.org"
      end
      if page_type && (!PAGE_PATHS.key?(page_type) || !uri.path.match?(%r{\A#{Regexp.escape(PAGE_PATHS[page_type])}[1-9]\d*/?\z}))
        raise ArgumentError, "URL path does not match page type"
      end
      uri
    rescue URI::InvalidURIError
      raise ArgumentError, "Invalid ASJJF URL"
    end

    def self.build(page_type, id)
      raise ArgumentError, "Invalid ASJJF id" unless id.to_s.match?(/\A[1-9]\d*\z/)
      "https://asjjf.org#{PAGE_PATHS.fetch(page_type)}#{id}"
    end
  end
end
