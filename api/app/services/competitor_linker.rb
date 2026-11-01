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
require "zlib"

class CompetitorLinker
  VALID_BELTS = %w[white blue purple brown black].freeze
  BELT_ORDER = { "white" => 0, "blue" => 1, "purple" => 2, "brown" => 3, "black" => 4 }.freeze

  class << self
    def link_event(event)
      link_results(event.event_results.where(competitor_id: nil))
    end

    def link_all
      total_created = 0
      total_linked = 0

      EventResult.where(competitor_id: nil).find_in_batches(batch_size: 1000) do |batch|
        stats = link_results(EventResult.where(id: batch.map(&:id)))
        total_created += stats[:created]
        total_linked += stats[:linked]
      end

      { created: total_created, linked: total_linked }
    end

    def link_results(results)
      grouped = results.group_by { |r| normalize(r.competitor_name) }
      created = 0
      linked = 0

      grouped.each do |norm_name, group|
        next if norm_name.blank?

        sample = best_sample(group)
        competitor = find_or_create(sample.competitor_name, sample)
        next unless competitor
        created += 1 if competitor.previously_new_record?

        group.each do |result|
          next if Identity::NameNormalizer.truncated?(result.competitor_name)
          next unless compatible_result?(competitor, result)
          result.update_columns(competitor_id: competitor.id,
            raw_competitor_name: result.raw_competitor_name.presence || result.competitor_name,
            country_code: normalize_country(result.country_code))
          linked += 1
        end
      end

      { created: created, linked: linked }
    end

    def find_or_create(full_name, sample_result = nil)
      normalized = normalize(full_name)
      return nil if normalized.blank? || Identity::NameNormalizer.truncated?(full_name)

      candidates = name_candidates(normalized)
      return nil if candidates.many? || candidates.any?(&:identity_separate?)
      competitor = candidates.first
      return compatible_result?(competitor, sample_result) ? competitor : nil if competitor

      first_name, last_name = split_asjjf_name(full_name)
      belt = extract_belt(sample_result)
      country = normalize_country(sample_result&.country_code)

      Competitor.transaction do
        lock_key = 184527002
        Competitor.connection.execute("SELECT pg_advisory_xact_lock(#{lock_key})")

        candidates = name_candidates(normalized)
        return nil if candidates.many? || candidates.any?(&:identity_separate?)
        competitor = candidates.first
        return compatible_result?(competitor, sample_result) ? competitor : nil if competitor

        Competitor.create!(
          first_name: first_name,
          last_name: last_name,
          academy: sample_result&.academy,
          country_code: country,
          belt_rank: belt
        )
      end
    end

    def normalize_country(code)
      Identity::CountryCode.normalize(code)
    end

    def backfill_metadata
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

    private

    def normalize(name)
      Identity::NameNormalizer.key(name)
    end

    def name_candidates(key)
      indexed = Competitor.where(normalized_name: key).or(Competitor.where(reverse_normalized_name: key)).to_a
      legacy = Competitor.where(normalized_name: nil).select do |competitor|
        [normalize("#{competitor.first_name} #{competitor.last_name}"),
          normalize("#{competitor.last_name} #{competitor.first_name}")].include?(key)
      end
      (indexed + legacy).uniq(&:id)
    end

    def compatible_result?(competitor, sample)
      return true unless sample
      genders = competitor.event_results.where.not(gender: [nil, ""]).distinct.pluck(:gender)
      return false if sample.gender.present? && genders.any? && !genders.include?(sample.gender)
      categories = competitor.event_results.where(event_id: sample.event_id).pluck(:age_category).compact
      kid = ->(category) { category.to_s.match?(/kid|child|infant/i) }
      return false if sample.age_category.present? && categories.any? { |category| kid.call(category) != kid.call(sample.age_category) }
      true
    end

    def split_asjjf_name(full_name)
      Identity::NameNormalizer.person_parts(full_name)
    end

    # Pick the highest valid belt rank from all results for this competitor
    def extract_belt(sample_or_results)
      results = sample_or_results.is_a?(Array) ? sample_or_results : [sample_or_results].compact
      belts = results.map { |r| r.belt_rank&.downcase }.compact & VALID_BELTS
      belts.max_by { |b| BELT_ORDER[b] || -1 }
    end

    # Pick the result with the richest metadata (valid belt, country present)
    def best_sample(results)
      results.max_by do |r|
        score = 0
        score += 10 if VALID_BELTS.include?(r.belt_rank&.downcase)
        score += 5 if r.country_code.present?
        score += 3 if r.academy.present?
        score += 1 if r.placement == 1
        score
      end
    end
  end
end
