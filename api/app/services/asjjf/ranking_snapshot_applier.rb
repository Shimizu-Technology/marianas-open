module Asjjf
  class RankingSnapshotApplier
    class IncompleteSnapshot < StandardError; end

    def initialize(snapshot, allow_reduction: false)
      @allow_reduction = allow_reduction
      @snapshot = snapshot
      @data = snapshot.parsed_summary.deep_stringify_keys
    end

    def call
      return unless %w[individual_ranking individual_ranking_division team_ranking].include?(@snapshot.page_type)
      targets = lists.to_a
      outcomes = targets.map do |list|
        list.with_lock do
          next if @snapshot.page_type != "individual_ranking_division" && list.asjjf_ranking_id != @snapshot.asjjf_id
          if @snapshot.outcome != "ok" || @snapshot.parse_status != "parsed"
            target = @snapshot.page_type == "individual_ranking_division" ? list.asjjf_ranking_divisions.find_by!(asjjf_division_id: @snapshot.asjjf_id) : list
            next :preserved if target.asjjf_ranking_entries.exists?
            target.update!(status: "unavailable")
            next :unavailable
          end
          next :skipped if @snapshot.page_type != "individual_ranking_division" && newer?(list)
          validate_identity!(list)
          case @snapshot.page_type
          when "individual_ranking" then apply_index(list)
          when "individual_ranking_division"
            division = list.asjjf_ranking_divisions.find_by!(asjjf_division_id: @snapshot.asjjf_id)
            validate_division!(division, @data.fetch("division"))
            newer?(division) ? :skipped : replace_entries(list, division)
          when "team_ranking" then replace_entries(list, nil)
          end
        end
      end
      outcomes.include?(:applied) ? :applied : (outcomes.compact.last || :unconfigured)
    end

    private

    def lists
      if @snapshot.page_type == "individual_ranking_division"
        AsjjfRankingList.where(id: AsjjfRankingDivision.where(asjjf_division_id: @snapshot.asjjf_id).select(:asjjf_ranking_list_id))
      else
        kind = @snapshot.page_type == "team_ranking" ? "team" : "individual"
        category = @snapshot.params.fetch("rankType", "adult").downcase
        AsjjfRankingList.where(asjjf_ranking_id: @snapshot.asjjf_id, kind: kind, category: category)
      end
    end

    def newer?(record)
      source = record.source_snapshot
      source && ([ source.fetched_at, source.id ] <=> [ @snapshot.fetched_at, @snapshot.id ]) == 1
    end

    def validate_identity!(list)
      return if @snapshot.page_type == "individual_ranking_division"
      title = @data.fetch("title")
      unless title.match?(/\AMarianas Pro\b.*\bRanking\s+#{list.season_year}\z/i) &&
          @data.fetch("ranking_id").to_i == list.asjjf_ranking_id && @data.fetch("discipline") == list.discipline
        raise IncompleteSnapshot, "Ranking title, season, discipline or ID disagrees with confirmed configuration"
      end
    end

    def apply_index(list)
      divisions = @data.fetch("divisions")
      unless divisions.any? && divisions.size == @data.dig("counts", "divisions") && divisions.map { |d| d.fetch("id") }.uniq.size == divisions.size
        raise IncompleteSnapshot, "Incomplete division inventory"
      end
      incoming_ids = divisions.map { |data| data.fetch("id").to_i }
      removed = list.asjjf_ranking_divisions.where.not(asjjf_division_id: incoming_ids)
      if removed.exists? && !@allow_reduction
        raise IncompleteSnapshot, "Division inventory changed: #{removed.count} previous divisions are missing; review the saved source before approving replacement"
      end
      removed.destroy_all if @allow_reduction
      divisions.each_with_index do |data, index|
        division = list.asjjf_ranking_divisions.find_or_initialize_by(asjjf_division_id: data.fetch("id"))
        division.update!(gender: data.fetch("gender").capitalize, age_group: data.fetch("age"), belt: data.fetch("belt").capitalize,
          label: data.fetch("name"), position: index)
      end
      default = list.asjjf_ranking_divisions.find_by!(asjjf_division_id: @data.fetch("default_division").fetch("id"))
      replace_entries(list, default) unless newer?(default)
      list.update!(title: @data.fetch("title"), source_snapshot: @snapshot, last_synced_at: @snapshot.fetched_at, status: "available")
      # A division may have arrived before the index apply job ran. Recover it now.
      ids = divisions.map { |d| d.fetch("id") }
      AsjjfSnapshot.where(page_type: "individual_ranking_division", asjjf_id: ids, parse_status: "parsed", outcome: "ok")
        .select("DISTINCT ON (asjjf_id) id, asjjf_id").order(:asjjf_id, fetched_at: :desc, id: :desc).each do |saved|
          ApplyRankingSnapshotJob.perform_later(saved.id)
        end
      :applied
    end

    def validate_division!(division, data)
      unless division.gender.casecmp?(data.fetch("gender")) && division.belt.casecmp?(data.fetch("belt")) && division.age_group.casecmp?(data.fetch("age"))
        raise IncompleteSnapshot, "Division labels disagree with the confirmed index"
      end
    end

    def identity_candidates(name)
      @competitor_keys ||= begin
        keys = Hash.new { |hash, key| hash[key] = [] }
        Competitor.find_each do |competitor|
          [ "#{competitor.first_name} #{competitor.last_name}", "#{competitor.last_name} #{competitor.first_name}" ].each do |label|
            keys[Identity::NameNormalizer.key(label)] << competitor
          end
        end
        CompetitorAlias.includes(:competitor).find_each { |record| keys[record.normalized_key] << record.competitor }
        keys
      end
      @competitor_keys[Identity::NameNormalizer.key(name)].uniq(&:id)
    end

    def academy_candidates(name)
      @academy_keys ||= begin
        keys = Hash.new { |hash, key| hash[key] = [] }
        Academy.find_each do |academy|
          [ academy.name, *Array(academy.aliases) ].each { |label| keys[Identity::NameNormalizer.key(label)] << academy }
        end
        keys
      end
      @academy_keys[Identity::NameNormalizer.key(name)].uniq(&:id)
    end

    def replace_entries(list, division)
      target = division || list
      return :unchanged if target.source_snapshot_id == @snapshot.id
      rows = @data.fetch("rows")
      raise IncompleteSnapshot, "Incomplete ranking rows" unless rows.size == @data.dig("counts", "rows")
      existing = list.asjjf_ranking_entries.where(asjjf_ranking_division_id: division&.id)
      previous_count = existing.count
      raise IncompleteSnapshot, "Empty snapshot would remove previous entries" if rows.empty? && previous_count.positive?
      if rows.size < previous_count && !@allow_reduction
        raise IncompleteSnapshot, "Row count decreased from #{previous_count} to #{rows.size}; review the saved source before approving replacement"
      end
      # Validate every replacement before deleting any rows. Never create identities from rankings.
      replacements = rows.map do |row|
        candidates = list.kind == "individual" && !Identity::NameNormalizer.truncated?(row.fetch("name")) ? identity_candidates(row.fetch("name")) : []
        competitor = candidates.one? && !candidates.first.identity_separate? ? candidates.first : nil
        gyms = academy_candidates(row["academy"] || row.fetch("name"))
        academy = gyms.one? ? gyms.first : nil
        entry = list.asjjf_ranking_entries.build(asjjf_ranking_division: division, position: row.fetch("position"), name: row.fetch("name"),
          academy_name: row["academy"] || (list.kind == "team" ? row.fetch("name") : nil), raw_country_code: row["country"],
          country_code: Identity::CountryCode.normalize(row["country"]), points: row.fetch("points"), gold: row["gold"], silver: row["silver"], bronze: row["bronze"],
          competitor: competitor, academy: academy, source_snapshot: @snapshot)
        entry.validate!
        entry
      end
      existing.delete_all
      replacements.each(&:save!)
      attributes = { source_snapshot: @snapshot, last_synced_at: @snapshot.fetched_at, status: "available" }
      attributes[:title] = @data.fetch("title") unless division
      target.update!(attributes)
      list.update!(last_synced_at: [ list.last_synced_at, @snapshot.fetched_at ].compact.max, status: "available") if division
      :applied
    end
  end
end
