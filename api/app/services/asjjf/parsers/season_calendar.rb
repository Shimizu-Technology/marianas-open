require_relative "base"

module Asjjf
  module Parsers
    class SeasonCalendar < Base
      DEFAULT_MARIANAS_PATTERN = /\bmarianas\b/i

      # Return selected source events without changing or grouping gi/no-gi records.
      def self.select_marianas(events, pattern: DEFAULT_MARIANAS_PATTERN, event_ids: [], exclude_ids: [],
        dumau_pattern: /\bdumau\s+open\b/i, place_pattern: /\bguam\b/i)
        events.select do |event|
          !exclude_ids.include?(event[:event_id]) &&
            (event_ids.include?(event[:event_id]) || pattern&.match?(event[:title]) ||
              (dumau_pattern&.match?(event[:title]) && place_pattern&.match?(event[:place].to_s)))
        end
      end

      def parse
        id = source_id("main/eventsBySeason")
        raise ParseError, "Not an ASJJF calendar" unless title == "ASJJF TOURNAMENTS CALENDAR"
        names = required(@doc.css(".contents .event-name"), "calendar events")
        events = names.map do |name|
          link = name.ancestors("a").first
          href = required(link&.[]("href"), "event link")
          match = href.match(%r{/main/eventInfo/(\d+)\z})
          banner = link.at_css("img")&.[]("src")
          # Six published team events register with Google Forms; their ASJJF ID
          # is still published in the event banner path. Keep those calendar rows.
          banner_id = banner&.match(%r{/event_banners/(\d+)/})&.[](1)
          if match && banner_id && match[1] != banner_id
            raise ParseError, "Calendar event link and banner IDs disagree"
          end
          event_id = required(match&.[](1) || banner_id, "calendar event ID").to_i
          fields = link.css("strong").to_h do |label|
            value = label.parent.next_element
            [ text(label), text(value) ]
          end
          label = text(name)
          event_dates = required(fields["Event Date"], "event date").split(/\s*~\s*/).map { |date| local_date(date) }
          raise ParseError, "Invalid calendar event date range" unless (1..2).cover?(event_dates.length)
          { event_id: event_id, title: required(label, "event title"), url: absolute_url(href),
            discipline: discipline(label, optional: true), event_date: event_dates.first, event_end_date: event_dates.last,
            event_date_text: fields["Event Date"],
            registration_start_date: calendar_date(fields["Registration Start Date"]),
            registration_end_date: calendar_date(fields["Registration End Date"]),
            place: required(fields["Event Place"], "event place"),
            banner_url: absolute_url(banner) }
        end
        raise ParseError, "Duplicate calendar event IDs" unless events.map { |event| event[:event_id] }.uniq.length == events.length
        { url: @url, season_id: id, title: title, events: events, counts: { events: events.length } }
      end

      private

      def calendar_date(value)
        raise ParseError, "Missing calendar date field" if value.nil?
        return nil if value.empty?
        local_date(required(value, "calendar date"))
      end
    end
  end
end
