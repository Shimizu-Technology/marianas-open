require "csv"
require "set"

module Identity
  class Repair
    ACADEMY_HEADERS = %w[group_id academy_ids academy_names verdict canonical_name canonical_country evidence confidence results_count total_points].freeze
    ATHLETE_HEADERS = %w[type competitor_ids names verdict confidence evidence results history].freeze

    def self.call(decisions: nil, athletes: nil, apply: false, io: $stdout, actor: nil)
      new(decisions: decisions, athletes: athletes, io: io, actor: actor).call(apply: apply)
    end

    def self.hyphen_duplicates(athletes: nil, apply: false, io: $stdout, actor: nil)
      new(athletes: athletes, io: io, actor: actor).call(apply: apply, hyphens: true)
    end

    def initialize(decisions: nil, athletes: nil, io: $stdout, actor: nil)
      @decisions = read_csv(decisions, ACADEMY_HEADERS)
      @athletes = read_csv(athletes, ATHLETE_HEADERS)
      @io = io
      @actor = actor
    end

    def call(apply: false, hyphens: false)
      report = nil
      ApplicationRecord.transaction do
        before = snapshot
        operations = []
        skipped = []
        academy_operations(operations, skipped)
        if hyphens
          hyphen_operations(operations, skipped)
        else
          athlete_operations(operations, skipped)
        end
        projected = project(before, operations)
        operations.each { |operation| execute(operation) } if apply
        after = snapshot
        if after[:results] != before[:results] || after[:points] != before[:points]
          raise "Identity repair changed result or points totals; rolling back"
        end
        report = { apply: apply, before: before, after: after, projected: projected,
                   operations: operations, skipped: skipped }
      end
      @io.puts(JSON.pretty_generate(report))
      report
    end

    private

    def read_csv(path, headers)
      return [] if path.blank?
      table = CSV.read(path, headers: true, encoding: "bom|utf-8")
      missing = headers - Array(table.headers)
      raise ArgumentError, "Missing CSV headers: #{missing.join(', ')}" if missing.any?
      table.reject { |row| row.fields.all?(&:blank?) }.map(&:to_h)
    end

    def ids(value)
      tokens = value.to_s.split
      unless tokens.any? && tokens.all? { |token| token.match?(/\A[1-9]\d*\z/) } && tokens.uniq.size == tokens.size
        raise ArgumentError, "Expected distinct positive record IDs, got #{value.inspect}"
      end
      tokens.map(&:to_i)
    end

    def academy_operations(operations, skipped)
      used = Set.new
      @decisions.each do |row|
        label = row.fetch("group_id")
        unless %w[MERGE_SAME_GYM RENAME_ONLY].include?(row["verdict"])
          skipped << { group: label, reason: "verdict #{row['verdict']}" }
          next
        end
        records = Academy.where(id: ids(row["academy_ids"])).to_a
        if records.empty? || records.any? { |record| used.include?(record.id) }
          skipped << { group: label, reason: "missing records or overlapping CSV group" }
          next
        end
        expected_keys = row["academy_names"].to_s.split("|").map { |name| NameNormalizer.key(name.strip.sub(/\s+\[[^\]]*\]\z/, "")) }
        if records.any? { |record| ([ record.name ] + Array(record.aliases)).none? { |name| expected_keys.include?(NameNormalizer.key(name)) } }
          skipped << { group: label, reason: "CSV names do not match current academies; requires review" }
          next
        end
        ordered = ids(row["academy_ids"]).filter_map { |id| records.find { |record| record.id == id } }
        canonical = row["canonical_name"].to_s.strip
        target = ordered.find { |record| NameNormalizer.key(record.name) == NameNormalizer.key(canonical) } || ordered.first
        if row["verdict"] == "RENAME_ONLY" && ordered.size != 1
          raise ArgumentError, "RENAME_ONLY requires exactly one academy (#{label})"
        end
        used.merge(ordered.map(&:id))
        if row["verdict"] == "MERGE_SAME_GYM"
          (ordered - [ target ]).each do |source|
            operations << { type: :academy_merge, group: label, source_id: source.id, target_id: target.id }
          end
        end
        if canonical.blank? || canonical.match?(/[()?]|\bconfirm\b/i)
          skipped << { group: label, reason: "canonical display name needs a decision; retaining #{target.name}" }
          next
        end
        country = CountryCode.normalize(row["canonical_country"])
        if target.name != canonical || (country.present? && target.country_code != country)
          operations << { type: :academy_rename, group: label, target_id: target.id, name: canonical, country_code: country }
        end
      end
    end

    def athlete_operations(operations, skipped)
      used = Set.new
      # A separate/uncertain verdict takes precedence even if another row says SAME_PERSON.
      protected_ids = protected_athlete_ids
      @athletes.each_with_index do |row, index|
        label = "athlete row #{index + 2}"
        unless row["verdict"] == "SAME_PERSON" && row["confidence"].to_s.downcase == "high"
          skipped << { group: label, reason: "verdict/confidence #{row['verdict']}/#{row['confidence']}" }
          next
        end
        requested = ids(row["competitor_ids"])
        if (requested.to_set & protected_ids).any?
          skipped << { group: label, reason: "identity has a separate or uncertain CSV verdict" }
          next
        end
        records = Competitor.where(id: requested).order(:id).to_a
        expected_keys = row["names"].to_s.split("|").map { |name| NameNormalizer.key(name) }
        if records.any? { |person| [ NameNormalizer.key("#{person.first_name} #{person.last_name}"), NameNormalizer.key("#{person.last_name} #{person.first_name}") ].none? { |key| expected_keys.include?(key) } }
          skipped << { group: label, reason: "CSV names do not match current athletes; requires review" }
          next
        end
        plan_athletes(records, label, operations, skipped, used)
      end
    end

    def hyphen_operations(operations, skipped)
      groups = Competitor.order(:id).to_a.group_by { |person| NameNormalizer.key("#{person.first_name} #{person.last_name}") }
      used = Set.new
      protected_ids = protected_athlete_ids
      groups.each do |key, people|
        next if key.blank? || people.size < 2
        names = people.map { |person| "#{person.first_name} #{person.last_name}" } + EventResult.where(competitor_id: people.map(&:id)).pluck(:competitor_name)
        next unless names.any? { |name| name.match?(/[-‐‑‒–—]/) }
        if people.any? { |person| protected_ids.include?(person.id) }
          skipped << { group: "hyphen #{key}", reason: "identity has a separate or uncertain CSV verdict" }
          next
        end
        plan_athletes(people, "hyphen #{key}", operations, skipped, used)
      end
    end

    def protected_athlete_ids
      @athletes.reject { |row| row["verdict"] == "SAME_PERSON" && row["confidence"].to_s.downcase == "high" }
        .flat_map { |row| ids(row["competitor_ids"]) }.to_set
    end

    def plan_athletes(people, label, operations, skipped, used)
      if people.size < 2 || people.any? { |person| used.include?(person.id) }
        skipped << { group: label, reason: "fewer than two remaining athletes or overlapping CSV group" }
        return
      end
      results = EventResult.where(competitor_id: people.map(&:id)).includes(:event).to_a
      target = people.first
      warnings = people.drop(1).flat_map { |source| HistoryCheck.call(source, target, results: results) }.uniq
      if people.any?(&:identity_separate?) || warnings.any?
        skipped << { group: label, reason: "identity/history requires review", warnings: warnings }
        return
      end
      used.merge(people.map(&:id))
      people.drop(1).each do |source|
        operations << { type: :competitor_merge, group: label, source_id: source.id, target_id: target.id }
      end
    end

    def execute(operation)
      case operation[:type]
      when :academy_merge
        AcademyMerge.call(source: Academy.find(operation[:source_id]), target: Academy.find(operation[:target_id]), confirm: true, actor: @actor)
      when :competitor_merge
        CompetitorMerge.call(source: Competitor.find(operation[:source_id]), target: Competitor.find(operation[:target_id]), confirm: true, actor: @actor)
      when :academy_rename
        academy = Academy.lock.find(operation[:target_id])
        old_name = academy.name
        aliases = (Array(academy.aliases) + [ old_name ]).uniq
        academy.update!(name: operation[:name], country_code: operation[:country_code].presence || academy.country_code)
        academy.update_columns(aliases: aliases)
        audit = operation.merge(action: "identity.academy_rename", old_name: old_name, actor_id: @actor&.id)
        ActiveRecord.after_all_transactions_commit { Rails.logger.info(audit.to_json) }
      end
    end

    def project(before, operations)
      academies = Academy.all.to_h { |academy| [ academy.id, { name: academy.name, aliases: Array(academy.aliases) } ] }
      people = Competitor.pluck(:id, :academy_id).to_h
      rows = EventResult.includes(:event).map do |row|
        { id: row.id, academy_id: row.academy_id, academy: row.academy, competitor_id: row.competitor_id,
         date: row.event&.date || Date.new(1, 1, 1), event_id: row.event_id,
         points: RankingCalculator.points_for(row.placement, row.event&.asjjf_stars) }
      end
      operations.each do |operation|
        source_id = operation[:source_id]
        target_id = operation[:target_id]
        case operation[:type]
        when :academy_merge
          names = projected_names(academies)
          rows.each { |row| row[:academy_id] = target_id if projected_gym(row, names) == source_id }
          people.transform_values! { |id| id == source_id ? target_id : id }
          source = academies.delete(source_id)
          academies[target_id][:aliases] += source[:aliases] + [ source[:name] ]
        when :academy_rename
          academies[target_id][:aliases] << academies[target_id][:name]
          academies[target_id][:name] = operation[:name]
        when :competitor_merge
          rows.each { |row| row[:competitor_id] = target_id if row[:competitor_id] == source_id }
          people.delete(source_id)
          latest = rows.select { |row| row[:competitor_id] == target_id }.max_by { |row| [ row[:date], row[:event_id], row[:id] ] }
          people[target_id] = latest ? projected_gym(latest, projected_names(academies)) : nil
        end
      end
      names = projected_names(academies)
      grouped = rows.group_by { |row| projected_gym(row, names) }
      gym_counts = people.values.tally
      per_academy = academies.to_h do |id, academy|
        attributed = grouped.fetch(id, [])
        [ id, { name: academy[:name], results: attributed.size, athletes: gym_counts.fetch(id, 0), points: attributed.sum { |row| row[:points] } } ]
      end
      { academies: academies.size, athletes: people.size, results: before[:results], points: before[:points], per_academy: per_academy }
    end

    def projected_names(academies)
      names = Hash.new { |hash, key| hash[key] = [] }
      academies.each do |id, academy|
        ([ academy[:name] ] + academy[:aliases]).each { |name| names[NameNormalizer.key(name)] << id }
      end
      names.transform_values { |ids| ids.uniq.one? ? ids.first : nil }
    end

    def projected_gym(row, names)
      row[:academy_id] || names[NameNormalizer.key(row[:academy])]
    end

    def snapshot
      results = AcademyAttribution.relation.group(:attributed_academy_id).count
      athletes = Competitor.group(:academy_id).count
      points = AcademyAttribution.relation.joins(:event).group(:attributed_academy_id).pluck(:attributed_academy_id, Arel.sql(RankingCalculator.points_sql)).to_h
      per_academy = Academy.order(:id).to_h do |academy|
        [ academy.id, { name: academy.name, results: results.fetch(academy.id, 0),
                       athletes: athletes.fetch(academy.id, 0), points: points.fetch(academy.id, 0).to_i } ]
      end
      { academies: per_academy.size, athletes: Competitor.count, results: EventResult.count,
        points: points.values.sum(&:to_i), per_academy: per_academy }
    end
  end
end
