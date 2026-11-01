require_relative "base"
require_relative "division"

module Asjjf
  module Parsers
    class IndividualRankingDivision < Base
      def parse
        id = source_id("ranking/individualRankingDivision")
        # This endpoint returns an HTML fragment, without the index's title/sidebar.
        raise ParseError, "Expected a ranking division fragment" if @doc.at_css("#individualRank, #right-menu, .breadcrumbs")
        division = Division.parse(required(text(@doc.at_css("h4")), "ranking division"))
        rows = ranking_rows(@doc)
        { url: @url, division_id: id, division: division, rows: rows, counts: { rows: rows.length } }
      end

      private

      def ranking_rows(scope)
        table = required(scope.at_css("table#listTable"), "individual ranking table")
        headers = table.css("thead th").map { |node| text(node) }
        unless headers == [ "Position", "", "Name", "Points", "Gold", "Silver", "Bronze" ]
          raise ParseError, "Wrong individual ranking columns"
        end
        complete_table!
        required(table.css("tbody tr"), "individual ranking rows").map do |row|
          cells = row.css("td")
          raise ParseError, "Invalid individual ranking row" unless cells.length == 7
          link = required(cells[2].at_css("strong a"), "ranked member link")
          member_id = required(link["href"]&.match(%r{/ranking/rankMemberDetails/(\d+)\?}), "ranked member ID")[1].to_i
          # The name is nested in <strong>; academy/country are separate direct text nodes.
          details = cells[2].children.select(&:text?).map { |node| text(node) }.reject(&:empty?)
          raise ParseError, "Missing ranked academy/country" unless details.length == 2
          { position: integer(cells[0], "position"), member_id: member_id, url: absolute_url(link["href"]),
            name: required(text(link), "member name"), academy: details[0], country: details[1],
            points: decimal(cells[3]), gold: integer(cells[4], "gold"), silver: integer(cells[5], "silver"),
            bronze: integer(cells[6], "bronze") }
        end
      end
    end
  end
end
