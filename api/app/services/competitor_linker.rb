# Finds or creates Competitor records from EventResult data and links them.
#
# ASJJF names come in "Last First" format (e.g., "Santos Rafael").
# We normalize names for matching and create new Competitors when no match is found.
#
# Usage:
#   CompetitorLinker.link_event(event)           # link all results for one event
#   CompetitorLinker.link_all                     # backfill all unlinked results
#   CompetitorLinker.find_or_create("Santos Rafael", sample_result)
#
class CompetitorLinker
  VALID_BELTS = %w[white blue purple brown black].freeze
  BELT_ORDER = { "white" => 0, "blue" => 1, "purple" => 2, "brown" => 3, "black" => 4 }.freeze

  # ASJJF uses ISO 3166-1 alpha-3 codes; convert to alpha-2 for flags
  COUNTRY_MAP = {
    "GUM" => "GU", "JPN" => "JP", "PHL" => "PH", "KOR" => "KR", "BRA" => "BR",
    "USA" => "US", "TAI" => "TW", "MNP" => "MP", "CHN" => "CN", "FRA" => "FR",
    "PLW" => "PW", "GBR" => "GB", "CAN" => "CA", "FSM" => "FM", "PYF" => "PF",
    "AUS" => "AU", "NZL" => "NZ", "MEX" => "MX", "SGP" => "SG", "HKG" => "HK",
    "IND" => "IN", "THA" => "TH", "IDN" => "ID", "MYS" => "MY", "VNM" => "VN",
    "RUS" => "RU", "DEU" => "DE", "ESP" => "ES", "ITA" => "IT", "PRT" => "PT",
    "SWE" => "SE", "NOR" => "NO", "ARG" => "AR", "COL" => "CO", "PER" => "PE",
  }.freeze

  def self.link_event(event)
    link_results(event.event_results.where(competitor_id: nil))
  end

  def self.link_all
    link_results(EventResult.where(competitor_id: nil))
  end

  def self.link_results(results)
    grouped = results.group_by { |r| normalize(r.competitor_name) }
    created = 0
    linked = 0

    grouped.each do |_norm_name, group|
      sample = best_sample(group)
      competitor = find_or_create(sample.competitor_name, sample)
      created += 1 if competitor.previously_new_record?

      ids = group.map(&:id)
      EventResult.where(id: ids).update_all(competitor_id: competitor.id)
      linked += ids.size
    end

    { created: created, linked: linked }
  end

  def self.find_or_create(full_name, sample_result = nil)
    normalized = normalize(full_name)
    return Competitor.new(first_name: "Unknown", last_name: "Unknown") if normalized.blank?

    competitor = find_by_name(normalized)
    return competitor if competitor

    first_name, last_name = split_asjjf_name(full_name)
    belt = extract_belt(sample_result)
    country = normalize_country(sample_result&.country_code)

    Competitor.create!(
      first_name: first_name,
      last_name: last_name,
      academy: sample_result&.academy,
      country_code: country,
      belt_rank: belt
    )
  end

  private

  def self.normalize(name)
    name.to_s.strip.downcase.gsub(/\s+/, " ")
  end

  def self.find_by_name(normalized)
    Competitor
      .where(
        "LOWER(TRIM(CONCAT(last_name, ' ', first_name))) = :name " \
        "OR LOWER(TRIM(CONCAT(first_name, ' ', last_name))) = :name",
        name: normalized
      )
      .first
  end

  # ASJJF format is "LastName FirstName" — split on first space
  def self.split_asjjf_name(full_name)
    parts = full_name.strip.split(/\s+/, 2)
    if parts.size >= 2
      [parts[1].titleize, parts[0].titleize]
    else
      [parts[0].titleize, ""]
    end
  end

  # Pick the highest valid belt rank from all results for this competitor
  def self.extract_belt(sample_or_results)
    results = sample_or_results.is_a?(Array) ? sample_or_results : [sample_or_results].compact
    belts = results.map { |r| r.belt_rank&.downcase }.compact & VALID_BELTS
    belts.max_by { |b| BELT_ORDER[b] || -1 }
  end

  # Pick the result with the richest metadata (valid belt, country present)
  def self.best_sample(results)
    results.max_by do |r|
      score = 0
      score += 10 if VALID_BELTS.include?(r.belt_rank&.downcase)
      score += 5 if r.country_code.present?
      score += 3 if r.academy.present?
      score += 1 if r.placement == 1
      score
    end
  end

  def self.normalize_country(code)
    return nil if code.blank?
    code = code.strip.upcase
    return code if code.length == 2
    COUNTRY_MAP[code] || nil
  end

  # Update existing competitors with metadata from their linked results
  def self.backfill_metadata
    updated = 0
    Competitor.find_each do |competitor|
      results = competitor.event_results.to_a
      next if results.empty?

      changes = {}
      sample = best_sample(results)

      if competitor.country_code.blank? && sample.country_code.present?
        changes[:country_code] = normalize_country(sample.country_code)
      end

      if competitor.belt_rank.blank?
        belt = extract_belt(results)
        changes[:belt_rank] = belt if belt.present?
      end

      if competitor.academy.blank? && sample.academy.present?
        changes[:academy] = sample.academy
      end

      if changes.any?
        competitor.update_columns(changes)
        updated += 1
      end
    end
    updated
  end
end
