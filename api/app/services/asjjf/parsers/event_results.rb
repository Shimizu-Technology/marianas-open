require_relative "base"
require_relative "division"

module Asjjf
  module Parsers
    class EventResults < Base
      def parse
        id = source_id("main/eventResults", "main/resultsList")
        category = required(text(@doc.at_css(".headline h3")), "results category")
        raise ParseError, "Unrecognized results category" unless category.match?(/\A(?:Male|Female) (?:Adult|Kids)\z/i)
        validate_category!(category)
        complete_table!
        headings = @doc.css("table thead h5")
        if headings.empty?
          # Accept only a complete, genuinely empty results table (or ASJJF's
          # explicit empty message), never an unrelated or partly parsed page.
          table = @doc.at_css(".list-table table")
          empty = table && (text(table).empty? || text(table).match?(/\A(?:No (?:results|records)(?: found)?[.!]?|There are no results[.!]?)\z/i))
          raise ParseError, "Missing result divisions" unless empty && @doc.css("td.fighter-name").empty?
        end
        empty_divisions = []
        divisions = headings.filter_map do |heading|
          division = Division.parse(text(heading), weight: true)
          raise ParseError, "Division gender disagrees with category" unless division[:gender] == category.split.first.downcase
          kids = division[:age].match?(/\AKid /i)
          raise ParseError, "Division age disagrees with category" unless kids == category.match?(/Kids\z/i)
          body = heading.ancestors("thead").first.next_element
          raise ParseError, "Missing division placements" unless body&.name == "tbody"
          # ASJJF lists some divisions with a present but empty placements table
          # (nobody placed, e.g. Hong Kong 2026 "Male Black Master 41 Middle").
          # Record those instead of failing the page; a tbody with any content
          # still has to parse as complete placements.
          if body.element_children.empty? && text(body).empty?
            empty_divisions << division[:name]
            next
          end
          placements = required(body.css("tr"), "division placements").map { |row| placement(row) }
          raise ParseError, "Division must have exactly one gold placement" unless placements.count { |p| p[:position] == 1 } == 1
          division.merge(placements: placements, alone_in_bracket: placements.length == 1)
        end
        raise ParseError, "Every division is missing placements" if divisions.empty? && empty_divisions.any?
        names = divisions.map { |d| d[:name] } + empty_divisions
        raise ParseError, "Duplicate division names" unless names.uniq.length == names.length
        unless @doc.css("td.fighter-name").length == divisions.sum { |d| d[:placements].length }
          raise ParseError, "Unparsed result rows"
        end
        { url: @url, event_id: id, title: title, discipline: discipline(title), category: category,
          divisions: divisions, empty_divisions: empty_divisions,
          counts: { divisions: divisions.length, placements: divisions.sum { |d| d[:placements].length },
                    alone_in_bracket: divisions.count { |d| d[:alone_in_bracket] }, empty_divisions: empty_divisions.length } }
      end

      private

      def validate_category!(category)
        query = URI.decode_www_form(@uri.query.to_s).to_h
        { "gender" => category.split.first, "age" => category.split.last }.each do |key, actual|
          next unless query[key]
          raise ParseError, "Results category disagrees with URL #{key}" unless query[key].casecmp?(actual)
        end
      end

      def placement(row)
        cells = row.css("td")
        raise ParseError, "Invalid placement row" unless cells.length == 4 && text(cells[0]).match?(/\A(?:1st|2nd|3rd)\z/)
        { position: text(cells[0]).to_i, name: required(text(cells[1]), "competitor name"),
          academy: required(text(cells[2]), "academy"), country: required(text(cells[3]), "country") }
      end
    end
  end
end
