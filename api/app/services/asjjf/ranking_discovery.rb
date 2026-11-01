module Asjjf
  class RankingDiscovery
    def self.call(snapshot)
      Nokogiri::HTML(snapshot.html).css('a[href*="/ranking/"]').each do |link|
        title = link.text.squish
        next unless title.match?(/\AMarianas Pro\b.*\bRanking\s+(20\d{2})\z/i)
        year = title[/\b(20\d{2})\z/, 1].to_i
        url = URI.join(snapshot.url, link["href"]).to_s
        match = url.match(%r{/ranking/(individualRanking|teamRank)/(\d+)\z})
        next unless match
        kind = match[1] == "teamRank" ? "team" : "individual"
        Asjjf::Url.parse(url, page_type: kind == "team" ? "team_ranking" : "individual_ranking")
        suggestion = AsjjfRankingSuggestion.find_or_initialize_by(asjjf_ranking_id: match[2].to_i, kind: kind)
        suggestion.update!(season_year: year, discipline: title.match?(/no[\s-]?gi/i) ? "nogi" : "gi",
          title: title, source_url: url, source_snapshot: snapshot)
      rescue URI::InvalidURIError, ArgumentError
        next
      end
    rescue StandardError => e
      Rails.logger.warn("[ASJJF] Ranking discovery for snapshot #{snapshot.id} skipped: #{e.class}: #{e.message}")
    end
  end
end
