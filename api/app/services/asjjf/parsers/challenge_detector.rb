require "nokogiri"

module Asjjf
  module Parsers
    class ChallengeDetector
      def self.challenged?(html)
        source = html.to_s
        # Successful pages also include Cloudflare's passive scripts/jsd/main.js.
        return true if source.match?(%r{/cdn-cgi/challenge-platform/(?:\S*/)?orchestrate/|\b_cf_chl_opt\b|\bcf-chl-[\w-]+|\bchallenge-form\b}i)

        doc = Nokogiri::HTML(source)
        return true if doc.at_css('#challenge-stage, #cf-challenge-running, .cf-turnstile, iframe[src*="challenges.cloudflare.com"]')
        title = doc.at_css("title")&.text.to_s
        title.match?(/just a moment|attention required|access denied|security verification/i) ||
          doc.text.match?(/verify (?:that )?you are human|checking your browser|enable javascript and cookies to continue/i)
      end
    end
  end
end
