# Scrapes event results from ASJJF.org for a given event.
#
# Usage:
#   # Preview (dry run):
#   result = AsjjfScraper.preview(asjjf_event_ids: [1732, 1759])
#   # => { results: [...], summary: { total: 253, by_belt: {...}, ... } }
#
#   # Import into database:
#   AsjjfScraper.import!(event:, asjjf_event_ids: [1732, 1759])
#
class AsjjfScraper
  class ScraperError < StandardError; end

  VALID_BELTS = %w[white blue purple brown black].freeze

  def self.preview(asjjf_event_ids:)
    all_results = fetch_and_parse(asjjf_event_ids)
    { results: all_results, summary: build_summary(all_results) }
  end

  def self.import!(event:, asjjf_event_ids:)
    all_results = fetch_and_parse(asjjf_event_ids)
    raise ScraperError, "No results found from ASJJF" if all_results.empty?

    ActiveRecord::Base.transaction do
      event.event_results.delete_all
      batch = all_results.map do |r|
        {
          event_id: event.id,
          division: r[:division],
          gender: r[:gender],
          belt_rank: r[:belt_rank],
          age_category: r[:age_category],
          weight_class: r[:weight_class],
          placement: r[:placement],
          competitor_name: r[:competitor_name],
          academy: r[:academy],
          country_code: r[:country_code],
          created_at: Time.current,
          updated_at: Time.current
        }
      end
      EventResult.insert_all(batch)
    end

    { imported: all_results.size, summary: build_summary(all_results) }
  end

  private

  def self.fetch_and_parse(asjjf_event_ids)
    has_multiple_types = asjjf_event_ids.size > 1
    all_results = []

    asjjf_event_ids.each do |asjjf_id|
      html = fetch_html(asjjf_id)
      next unless html

      is_nogi = html.match?(/no[\-\s]?gi/i)
      type_prefix = is_nogi ? "NOGI" : "GI"
      raw_results = parse_html(html)

      raw_results.each do |r|
        division = has_multiple_types ? "[#{type_prefix}] #{r[:division]}" : r[:division]
        parsed = parse_division(division)
        all_results << parsed.merge(
          division: division,
          placement: r[:placement_num],
          competitor_name: r[:name],
          academy: r[:academy],
          country_code: r[:country]
        )
      end

      sleep 1
    end

    all_results
  end

  def self.fetch_html(asjjf_id)
    uri = URI("https://asjjf.org/main/eventResults/#{asjjf_id}")
    response = Net::HTTP.get_response(uri)
    return nil unless response.code == "200"
    response.body
  rescue StandardError => e
    Rails.logger.error("ASJJF fetch failed for #{asjjf_id}: #{e.message}")
    nil
  end

  def self.parse_html(html)
    results = []
    sections = html.split(/<h5[^>]*>/)
    sections.shift

    sections.each do |section|
      div_match = section.match(/^(.*?)<\/h5>/m)
      next unless div_match

      division_name = div_match[1].gsub(/<[^>]+>/, "").gsub(/&nbsp;/, " ").gsub(/&amp;/, "&").strip.gsub(/\s+/, " ")
      next if division_name.empty?

      text = section[div_match.end(0)..].gsub(/<[^>]+>/, "\n").gsub(/&amp;/, "&").gsub(/&nbsp;/, " ")
      lines = text.lines.map(&:strip).reject(&:empty?)

      i = 0
      while i < lines.length
        if lines[i] =~ /^(1st|2nd|3rd)$/
          name = lines[i + 1]&.strip
          academy = lines[i + 2]&.strip
          country = lines[i + 3]&.strip

          if name && academy && country && country.length <= 5
            results << { division: division_name, placement: lines[i], placement_num: lines[i].gsub(/\D/, "").to_i, name: name, academy: academy, country: country }
            i += 4
          else
            i += 1
          end
        else
          i += 1
        end
      end
    end

    results
  end

  def self.parse_division(division_str)
    clean = division_str.strip.sub(/^\[(GI|NOGI)\]\s*/, "")
    parts = clean.split(" ")
    gender = parts[0]&.downcase
    belt = parts[1]&.downcase
    belt = VALID_BELTS.find { |b| clean.downcase.include?(b) } || belt unless VALID_BELTS.include?(belt)

    age_raw = parts[2]&.downcase
    age_category = case age_raw
                   when "juvenile" then "juvenile"
                   when "master" then "master_#{parts[3]}"
                   else "adult"
                   end

    weight_start = age_raw == "master" ? 4 : (parts[3]&.match?(/^\d/) ? 4 : 3)
    weight_class = parts[weight_start..].join(" ").downcase.gsub(" ", "_")

    { gender: gender, belt_rank: belt, age_category: age_category, weight_class: weight_class }
  end

  def self.build_summary(results)
    {
      total: results.size,
      by_belt: results.group_by { |r| r[:belt_rank] }.transform_values(&:count),
      by_gender: results.group_by { |r| r[:gender] }.transform_values(&:count),
      by_placement: { gold: results.count { |r| r[:placement] == 1 }, silver: results.count { |r| r[:placement] == 2 }, bronze: results.count { |r| r[:placement] == 3 } },
      academies: results.map { |r| r[:academy] }.uniq.count,
      countries: results.map { |r| r[:country_code] }.compact.uniq.count
    }
  end
end
