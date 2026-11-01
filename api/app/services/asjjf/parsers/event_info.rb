require_relative "base"

module Asjjf
  module Parsers
    class EventInfo < Base
      MONTH = /January|February|March|April|May|June|July|August|September|October|November|December/i
      FACT_PATTERNS = {
        dates: MONTH,
        registration: /regist|payment|deadline/i,
        correction: /correct|verification|check day/i,
        venue: /venue|fieldhouse|ball court/i,
        stars: /\bstars?\b|certif/i,
        fees: /\bfee|price|refund|\$|[￥¥]|\bJPY\b|\bUSD\b/i,
        currency: /\$|[￥¥]|\bcurrency\b|\bJPY\b|\bUSD\b|\bPHP\b/i,
        contact: /contact|@|landline|phone|whatsapp|LINE:|\bemail\b/i,
        spectator: /spectator|admission|tickets/i
      }.freeze

      def parse
        id = source_id("main/eventInfo")
        date_section = required(@doc.at_css("#dates"), "event dates section")
        venue_section = required(@doc.at_css("#local"), "venue section")
        price_section = required(@doc.at_css("#prices"), "fees section")
        event_dates = labeled_dates(date_section, "#eventDate", datetime: false)
        registration_dates = labeled_dates(date_section, "#registrationDate", datetime: true)
        correction = required(text(date_section.at_css("#correctionDeadline dd")), "correction deadline")
        venue = {
          name: required(text(venue_section.at_css(".table-responsive > strong")), "venue name"),
          address: required(text(venue_section.at_css("address")), "venue address"),
          map_url: venue_section.at_css("iframe")&.[]("src")
        }
        registration_link = @doc.css('a[href*="/main/eventNotice/"]').find { |link| text(link) == "Event Registration" }
        if registration_link && registration_link["href"].split("/").last != id.to_s
          raise ParseError, "Registration link disagrees with event ID"
        end
        blocks = narrative_blocks(@doc.at_css("#eventInfo"))
        narrative = blocks.map { |block| block[:text] }.join("\n")
        star_values = narrative.scan(/\b(\d+)\s*[- ]?\s*stars?\b/i).flatten.map(&:to_i).uniq
        raise ParseError, "Conflicting event star values" if star_values.length > 1
        fees = parse_fees(price_section, venue[:address])
        facts = FACT_PATTERNS.transform_values do |pattern|
          blocks.select { |block| "#{block[:heading]} #{block[:text]}".match?(pattern) }
        end
        { url: @url, event_id: id, title: title, discipline: discipline(title),
          dates: { event_start: event_dates[:start], event_end: event_dates[:end],
                   registration_start: registration_dates[:start], registration_end: registration_dates[:end],
                   correction_deadline: local_datetime(correction) },
          dates_text: text(date_section), registration_url: absolute_url(registration_link&.[]("href")),
          venue: venue, stars: star_values.first, fees: fees,
          currency: fees.map { |fee| fee[:currency] }.compact.uniq.then { |currencies| currencies.one? ? currencies.first : nil },
          contact: { emails: narrative.scan(/[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}/i).uniq,
                     phones: narrative.scan(/(?:\+\d{1,3}[ -])?\d{2,4}-\d{2,4}-\d{3,4}/).uniq },
          spectator_facts: facts[:spectator], facts: facts, information: blocks,
          counts: { fees: fees.length, information_blocks: blocks.length } }
      end

      private

      def labeled_dates(section, selector, datetime:)
        nodes = required(section.css("#{selector} dd"), selector)
        raise ParseError, "Expected start and end dates" unless nodes.length == 2
        nodes.to_h do |node|
          match = text(node).match(/\A(Start|End):\s*(.+)\z/)
          raise ParseError, "Invalid date label" unless match
          [ match[1].downcase.to_sym, datetime ? local_datetime(match[2]) : local_date(match[2]) ]
        end.tap do |dates|
          raise ParseError, "Missing start/end date" unless dates.keys.sort == %i[end start]
        end
      end

      def parse_fees(section, address)
        section.css("table").flat_map do |table|
          complete_table!
          headers = table.css("thead th").map { |node| text(node) }
          raise ParseError, "Unrecognized fees table" unless headers == [ "Dates", "Fee", "Only Weight / Weight + Open" ]
          # Tables share a wrapper; the immediately preceding headline identifies the audience.
          headline = table.previous_element
          group = required(text(headline&.at_css("h3")), "fee group")
          required(table.css("tbody tr"), "fee rows").map do |row|
            cells = row.css("td")
            raise ParseError, "Invalid fee row" unless cells.length == 3
            deadline = text(cells[0]).sub(/\AUntil\s+/, "")
            unless deadline.match?(/\A[A-Za-z]+ \d{1,2}, \d{4} \d{1,2}:\d{2} [AP]M\z/)
              raise ParseError, "Invalid fee deadline: #{deadline}"
            end
            until_at = DateTime.strptime(deadline, "%B %d, %Y %I:%M %p").strftime("%Y-%m-%dT%H:%M:%S")
            fee_text = text(cells[1])
            match = fee_text.match(/\A([$￥¥]|USD|JPY|PHP)\s*([\d,]+(?:\.\d+)?)\z/)
            raise ParseError, "Invalid fee: #{fee_text}" unless match
            # An ambiguous dollar/yen sign is resolved only with the published venue country.
            currency = case match[1]
            when "USD", "JPY", "PHP" then match[1]
            when "$" then "USD" if address.match?(/\bGuam\z/i)
            when "￥", "¥" then "JPY" if address.match?(/\bJapan\z/i)
            end
            { group: group, until: until_at, date_text: text(cells[0]), amount: decimal(match[2]),
              currency: currency, currency_symbol: match[1], fee_text: fee_text,
              division: required(text(cells[2]), "fee division") }
          rescue Date::Error
            raise ParseError, "Invalid fee deadline: #{deadline}"
          end
        end
      end

      def narrative_blocks(section)
        return [] unless section
        heading = nil
        section.css("h1, h2, h3, h4, h5, h6, p, li, tr").filter_map do |node|
          next if node.ancestors.any? { |ancestor| %w[p li tr].include?(ancestor.name) }
          value = text(node)
          next if value.empty?
          heading = value if node.name.match?(/\Ah[1-6]\z/)
          { heading: heading, text: value }
        end
      end
    end
  end
end
