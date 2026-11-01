require_relative "individual_ranking_division"

module Asjjf
  module Parsers
    class IndividualRanking < IndividualRankingDivision
      def parse
        id = source_id("ranking/individualRanking")
        section = required(@doc.at_css("#individualRank"), "individual ranking section")
        links = required(@doc.css('#right-menu a[href*="/ranking/individualRankingDivision/"]'), "ranking division links")
        divisions = links.map do |link|
          division_id = required(link["href"].match(%r{/individualRankingDivision/(\d+)\z}), "ranking division ID")[1].to_i
          Division.parse(text(link)).merge(id: division_id, url: absolute_url(link["href"]))
        end
        raise ParseError, "Duplicate ranking division IDs" unless divisions.map { |d| d[:id] }.uniq.length == divisions.length
        default_division = Division.parse(required(text(section.at_css("h4")), "default division"))
        selected = divisions.find do |division|
          %i[gender belt age].all? { |key| division[key].casecmp?(default_division[key]) }
        end
        raise ParseError, "Default division missing from index" unless selected
        rows = ranking_rows(section)
        { url: @url, ranking_id: id, title: title, discipline: discipline(title), divisions: divisions,
          default_division: default_division.merge(id: selected[:id]), rows: rows,
          counts: { divisions: divisions.length, rows: rows.length } }
      end
    end
  end
end
