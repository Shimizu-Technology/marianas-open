require "nokogiri"
require "uri"
require "date"
require "bigdecimal"
require_relative "challenge_detector"

module Asjjf
  module Parsers
    class ParseError < StandardError; end
    class ChallengeError < ParseError; end

    class Base
      def initialize(html, url:)
        raise ChallengeError, "ASJJF challenge page" if ChallengeDetector.challenged?(html)
        raise ParseError, "Empty ASJJF HTML" if html.to_s.strip.empty?

        @html = html.to_s
        @doc = Nokogiri::HTML(@html)
        @url = url.to_s
        @uri = URI.parse(@url)
        unless @uri.scheme == "https" && %w[asjjf.org dumau.asjjf.org].include?(@uri.host) && @uri.port == 443 && @uri.userinfo.nil? && @uri.fragment.nil?
          raise ParseError, "Expected an ASJJF source URL"
        end
      rescue URI::InvalidURIError
        raise ParseError, "Invalid ASJJF source URL"
      end

      private

      def text(node)
        (node.respond_to?(:text) ? node.text : node.to_s).gsub(/[[:space:]\u00a0]+/, " ").strip
      end

      def required(value, label)
        raise ParseError, "Missing #{label}" if value.nil? || value == "" || (value.respond_to?(:empty?) && value.empty?)
        value
      end

      def source_id(*routes)
        routes.each do |route|
          match = @uri.path.match(%r{\A/#{Regexp.escape(route)}(?:/(\d+))?/?\z})
          next unless match
          id = match[1] || URI.decode_www_form(@uri.query.to_s).to_h["id"]
          return Integer(id, 10) if id.to_s.match?(/\A\d+\z/) && id.to_i.positive?
        end
        raise ParseError, "Source URL does not match #{routes.join(' or ')}"
      rescue ArgumentError
        raise ParseError, "Invalid ASJJF URL query"
      end

      def title
        required(text(@doc.at_css(".breadcrumbs h1") || @doc.at_css("h1")), "page title")
      end

      # Discipline must come from this page's title, never its global navigation or prose.
      def discipline(label, optional: false)
        return "nogi" if label.match?(/\bno[\s-]?gi\b/i)
        return "gi" if label.match?(/\bgi\b|jiu[\s-]?jitsu/i)
        raise ParseError, "Missing discipline in title" unless optional
      end

      def absolute_url(href)
        return nil unless href
        uri = URI.join(@url, href)
        raise ParseError, "Invalid link scheme in ASJJF page" unless %w[http https].include?(uri.scheme) && uri.host
        uri.to_s
      rescue URI::InvalidURIError
        raise ParseError, "Invalid link in ASJJF page"
      end

      def integer(value, label)
        value = text(value)
        raise ParseError, "Invalid #{label}: #{value}" unless value.match?(/\A\d+\z/)
        raise ParseError, "Invalid position: #{value}" if label == "position" && value.to_i.zero?
        Integer(value, 10)
      end

      def decimal(value)
        value = text(value)
        raise ParseError, "Invalid decimal: #{value}" unless value.match?(/\A(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?\z/)
        BigDecimal(value.delete(","))
      end

      def local_date(value)
        raise ParseError, "Invalid date: #{value}" unless value.match?(/\A[A-Za-z]+, [A-Za-z]+ \d{1,2}, \d{4}\z/)
        Date.strptime(value, "%A, %B %d, %Y").iso8601
      rescue Date::Error
        raise ParseError, "Invalid date: #{value}"
      end

      def local_datetime(value)
        unless value.match?(/\A[A-Za-z]+, [A-Za-z]+ \d{1,2}, \d{4} \d{1,2}:\d{2} [AP]M\z/)
          raise ParseError, "Invalid local date/time: #{value}"
        end
        DateTime.strptime(value, "%A, %B %d, %Y %I:%M %p").strftime("%Y-%m-%dT%H:%M:%S")
      rescue Date::Error
        raise ParseError, "Invalid local date/time: #{value}"
      end

      def complete_table!
        raise ParseError, "Incomplete ASJJF table" unless @html.match?(%r{</table\s*>}i)
      end
    end
  end
end
