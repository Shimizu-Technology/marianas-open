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
    multiplier * (stars || 3) # default 3-star if not set
  end

  # Returns individual competitor rankings.
  # Options:
  #   belt:    filter by belt rank
  #   gi_nogi: "Gi", "No-Gi", or nil (combined)
  #   gender:  "male" or "female"
  #   limit:   max results (default 50)
  def self.individual(options = {})
    results = base_query(options)

    grouped = results.group_by { |r| normalize_name(r.competitor_name) }

    rankings = grouped.map do |name, records|
      total_points = records.sum { |r| points_for(r.placement, r.event_stars) }
      golds   = records.count { |r| r.placement == 1 }
      silvers = records.count { |r| r.placement == 2 }
      bronzes = records.count { |r| r.placement == 3 }

      {
        competitor_name: records.first.competitor_name, # use original casing from first record
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
  def self.teams(options = {})
    results = base_query(options)

    grouped = results.group_by { |r| normalize_name(r.academy.presence || "Independent") }

    rankings = grouped.map do |academy, records|
      total_points = records.sum { |r| points_for(r.placement, r.event_stars) }
      golds   = records.count { |r| r.placement == 1 }
      silvers = records.count { |r| r.placement == 2 }
      bronzes = records.count { |r| r.placement == 3 }

      {
        academy: records.first.academy.presence || "Independent",
        country_code: most_common(records.map(&:country_code)),
        total_points: total_points,
        gold: golds,
        silver: silvers,
        bronze: bronzes,
        athletes: records.map { |r| normalize_name(r.competitor_name) }.uniq.count,
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

  private

  def self.base_query(options)
    scope = EventResult
      .joins(:event)
      .select("event_results.*, events.asjjf_stars as event_stars, events.id as event_id")

    scope = scope.where(belt_rank: options[:belt]) if options[:belt].present?
    scope = scope.where(gender: options[:gender]) if options[:gender].present?
    scope = scope.where(event_id: options[:event_id]) if options[:event_id].present?

    # Gi/No-Gi filtering based on event name or division prefix
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

  def self.normalize_name(name)
    return "" if name.blank?
    name.strip.downcase.gsub(/\s+/, " ")
  end

  def self.most_common(arr)
    arr.compact.reject(&:blank?)
       .group_by(&:itself)
       .max_by { |_, v| v.size }
       &.first
  end
end
