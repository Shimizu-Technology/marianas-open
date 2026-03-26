# Calculates rankings based on ASJJF's star-based points formula.
# See docs/RANKING-SYSTEM.md for full documentation.
#
# Points per placement = base_multiplier × event.asjjf_stars
#   Gold:   15 × stars
#   Silver:  7 × stars
#   Bronze:  3 × stars
#
# Missing from our data: per-match bonuses (+3 submission, +1 decision).
# Our rankings will be ~5-10% lower than ASJJF official but relative
# ordering should be very close.
class RankingCalculator
  PLACEMENT_MULTIPLIERS = { 1 => 15, 2 => 7, 3 => 3 }.freeze

  def self.points_for(placement, stars)
    multiplier = PLACEMENT_MULTIPLIERS[placement] || 0
    multiplier * (stars || 3)
  end

  # SQL fragment for computing total points: SUM(CASE placement WHEN 1 THEN 15 ... END * stars)
  def self.points_sql(placement_col: "event_results.placement", stars_col: "COALESCE(events.asjjf_stars, 3)")
    cases = PLACEMENT_MULTIPLIERS.map { |p, m| "WHEN #{p} THEN #{m}" }.join(" ")
    "SUM(CASE #{placement_col} #{cases} ELSE 0 END * #{stars_col})"
  end

  # Returns individual competitor rankings.
  # Groups by competitor_id when available, falls back to name for unlinked results.
  # Merges name-based groups into id-based groups to avoid split entries.
  def self.individual(options = {})
    results = base_query(options)

    grouped = results.group_by do |r|
      r.competitor_id.present? ? "id:#{r.competitor_id}" : "name:#{normalize_name(r.competitor_name)}"
    end

    id_name_map = {}
    grouped.each do |key, records|
      next unless key.start_with?("id:")
      id_name_map[normalize_name(records.first.competitor_name)] = key
    end

    grouped.keys.select { |k| k.start_with?("name:") }.each do |name_key|
      norm = name_key.delete_prefix("name:")
      if (id_key = id_name_map[norm])
        grouped[id_key].concat(grouped.delete(name_key))
      end
    end

    rankings = grouped.map do |_key, records|
      total_points = records.sum { |r| points_for(r.placement, r.event_stars) }
      golds   = records.count { |r| r.placement == 1 }
      silvers = records.count { |r| r.placement == 2 }
      bronzes = records.count { |r| r.placement == 3 }

      {
        competitor_name: records.first.competitor_name,
        competitor_id: records.first.competitor_id,
        academy: most_common(records.map(&:academy)),
        country_code: most_common(records.map(&:country_code)),
        total_points: total_points,
        gold: golds,
        silver: silvers,
        bronze: bronzes,
        events_competed: records.map(&:event_id).uniq.count,
        results_count: records.count
      }
    end

    rankings
      .sort_by { |r| [-r[:total_points], -r[:gold], -r[:silver]] }
      .first(options[:limit] || 50)
  end

  # Returns academy/team rankings.
  # Groups by academy_id when available, falls back to academy name string.
  # Merges name-based groups into id-based groups to avoid split entries
  # during the window between import and linking completion.
  def self.teams(options = {})
    results = base_query(options)

    grouped = results.group_by do |r|
      if r.respond_to?(:competitor_academy_id) && r.competitor_academy_id.present?
        "id:#{r.competitor_academy_id}"
      else
        "name:#{normalize_name(r.academy.presence || 'Independent')}"
      end
    end

    id_name_map = {}
    grouped.each do |key, records|
      next unless key.start_with?("id:")
      id_name_map[normalize_name(records.first.academy.presence || "Independent")] = key
    end

    grouped.keys.select { |k| k.start_with?("name:") }.each do |name_key|
      norm = name_key.delete_prefix("name:")
      if (id_key = id_name_map[norm])
        grouped[id_key].concat(grouped.delete(name_key))
      end
    end

    rankings = grouped.map do |_key, records|
      total_points = records.sum { |r| points_for(r.placement, r.event_stars) }
      golds   = records.count { |r| r.placement == 1 }
      silvers = records.count { |r| r.placement == 2 }
      bronzes = records.count { |r| r.placement == 3 }

      academy_id = records.first.respond_to?(:competitor_academy_id) ? records.first.competitor_academy_id : nil

      {
        academy: records.first.academy.presence || "Independent",
        academy_id: academy_id,
        country_code: most_common(records.map(&:country_code)),
        total_points: total_points,
        gold: golds,
        silver: silvers,
        bronze: bronzes,
        athletes: records.map { |r| r.competitor_id || normalize_name(r.competitor_name) }.uniq.count,
        events_competed: records.map(&:event_id).uniq.count
      }
    end

    rankings
      .sort_by { |r| [-r[:total_points], -r[:gold], -r[:silver]] }
      .first(options[:limit] || 50)
  end

  # Returns country rankings.
  def self.countries(options = {})
    results = base_query(options)

    grouped = results.group_by { |r| r.country_code.presence || "Unknown" }

    rankings = grouped.map do |country, records|
      total_points = records.sum { |r| points_for(r.placement, r.event_stars) }
      golds   = records.count { |r| r.placement == 1 }

      {
        country_code: country,
        total_points: total_points,
        gold: golds,
        silver: records.count { |r| r.placement == 2 },
        bronze: records.count { |r| r.placement == 3 },
        athletes: records.map { |r| normalize_name(r.competitor_name) }.uniq.count,
        academies: records.map { |r| normalize_name(r.academy.presence || "") }.uniq.count - 1 # subtract empty
      }
    end

    rankings
      .sort_by { |r| [-r[:total_points], -r[:gold]] }
      .first(options[:limit] || 50)
  end

  class << self
    private

    def base_query(options)
      scope = EventResult
        .joins(:event)
        .left_joins(:competitor)
        .select(
          "event_results.*, events.asjjf_stars as event_stars, events.id as event_id, " \
          "event_results.competitor_id, competitors.academy_id as competitor_academy_id"
        )

      scope = scope.where("LOWER(event_results.belt_rank) = ?", options[:belt].downcase) if options[:belt].present?
      scope = scope.where(gender: options[:gender]) if options[:gender].present?
      scope = scope.where(event_id: options[:event_id]) if options[:event_id].present?

      if options[:gi_nogi].present?
        case options[:gi_nogi].downcase
        when "gi"
          scope = scope.where("event_results.division NOT LIKE '[NOGI]%'")
        when "no-gi", "nogi"
          scope = scope.where("event_results.division LIKE '[NOGI]%'")
        end
      end

      scope.to_a
    end

    def normalize_name(name)
      return "" if name.blank?
      name.strip.downcase.gsub(/\s+/, " ")
    end

    def most_common(arr)
      arr.compact.reject(&:blank?)
         .group_by(&:itself)
         .max_by { |_, v| v.size }
         &.first
    end
  end
end
