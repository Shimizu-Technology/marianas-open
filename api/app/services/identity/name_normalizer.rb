module Identity
  module NameNormalizer
    module_function

    # Escape markup first: imported text is a name, never HTML. Nokogiri also
    # decodes named entities (including nbsp) that CGI.unescapeHTML omits.
    def clean(value)
      escaped = value.to_s.gsub("<", "&lt;").gsub(">", "&gt;")
      Nokogiri::HTML5.fragment(escaped).text.unicode_normalize(:nfkc)
        .tr("\u2018\u2019\u02bc", "'").tr("\u201c\u201d", '"')
        .gsub(/[[:space:]]+/, " ").strip
    end

    def key(value)
      clean(value).downcase(:fold).gsub(/[^\p{L}\p{N}]/, "")
    end

    def display(value)
      clean(value)
    end

    def person_display(value)
      clean(value).split(" ").map do |word|
        word.split(/([-'])/).map do |part|
          if part.match?(/\p{L}/) && (part == part.downcase || part == part.upcase)
            part.downcase.sub(/\p{L}/, &:upcase)
          else
            part
          end
        end.join
      end.join(" ")
    end

    # ASJJF supplies family name first. Never use titleize: it removes hyphens.
    def person_parts(value)
      words = clean(value).split(" ")
      # Common ASJJF family-name particles are part of the surname. Keep the
      # remaining words in their supplied order rather than guessing initials.
      prefix = words.first.to_s.downcase
      surname_size = if (prefix == "de" && %w[la las los].include?(words[1].to_s.downcase)) ||
          (prefix == "van" && %w[der den de].include?(words[1].to_s.downcase))
        3
      elsif %w[delos dela del de van von san santa santo].include?(prefix)
        2
      else
        1
      end
      surname_size = 1 if words.size <= surname_size
      last = words.take(surname_size).join(" ")
      first = words.drop(surname_size).join(" ").presence || last
      [ person_display(first), person_display(last) ]
    end

    def person_name(value)
      person_parts(value).join(" ")
    end

    def truncated?(value)
      clean(value).match?(/\.{2,}|…/)
    end
  end
end
