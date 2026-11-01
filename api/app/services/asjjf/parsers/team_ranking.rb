require_relative "base"

module Asjjf
  module Parsers
    class TeamRanking < Base
      def parse
        id = source_id("ranking/teamRank")
        section = required(@doc.at_css("#academyRank"), "team ranking section")
        table = required(section.at_css("table#listTable"), "team ranking table")
        headers = table.css("thead th").map { |node| text(node) }
        raise ParseError, "Wrong team ranking columns" unless headers == [ "Position", "", "Team", "Points" ]
        complete_table!
        rows = required(table.css("tbody tr"), "team ranking rows").map do |row|
          cells = row.css("td")
          raise ParseError, "Invalid team ranking row" unless cells.length == 4
          link = cells[2].at_css("a")
          { position: integer(cells[0], "position"), name: required(text(cells[2]), "team name"),
            points: decimal(cells[3]), team_id: link&.[]("href")&.match(%r{/teamRankDetails/(\d+)})&.[](1)&.to_i,
            url: absolute_url(link&.[]("href")) }
        end
        category = required(text(section.at_css("h2")), "team category")
        match = category.match(/\A(Adults?|Kids) Team Ranking\z/i)
        raise ParseError, "Unrecognized team ranking category" unless match
        actual = match[1].downcase.start_with?("adult") ? "adult" : "kids"
        expected = URI.decode_www_form(@uri.query.to_s).to_h.fetch("rankType", "adult").downcase
        raise ParseError, "Team ranking category disagrees with URL" unless actual == expected
        { url: @url, ranking_id: id, title: title, discipline: discipline(title),
          category: category, rows: rows, counts: { rows: rows.length } }
      end
    end
  end
end
