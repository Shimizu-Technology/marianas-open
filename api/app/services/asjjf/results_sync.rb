require "digest"

module Asjjf
  class ResultsSync
    class StaleReview < StandardError; end
    class InvalidReview < StandardError; end
    FIELDS = %w[source asjjf_event_id discipline division division_key gender belt_rank age_category weight_class placement competitor_name academy country_code alone_in_bracket].freeze

    def initialize(event)
      @event = event
    end

    def call(trigger: "snapshot", apply: true)
      run = with_evidence_lock do
        proposal = build_proposal
        previous = @event.results_sync_runs.where(status: "held")
          .where("diff_summary->>'fingerprint' = ?", proposal[:summary][:fingerprint]).order(id: :desc).first
        # Repeated evaluations of the same hold/discard are quiet and cannot
        # silently reintroduce a proposal an administrator discarded.
        if previous&.status == "held" && previous.diff_summary["fingerprint"] == proposal[:summary][:fingerprint]
          @event.update_columns(results_sync_status: "held", results_last_checked_at: Time.current, results_sync_run_id: previous.id)
          next previous
        end
        status = if !@assembly.complete?
          "incomplete"
        elsif @guards.any? || (!apply && changes?)
          "held"
        elsif changes?
          apply_changes!
          "applied"
        else
          "no_changes"
        end
        record_run(status, trigger, proposal)
      end
      notify(run)
      run
    rescue StandardError => e
      record_failure(e, trigger: trigger)
    end

    def approve!(run, user:)
      result = with_evidence_lock do
        run.reload
        raise InvalidReview, "This review is no longer awaiting approval" unless run.event_id == @event.id && run.status == "held" && run.discarded_at.nil?
        proposal = build_proposal
        unless @assembly.complete? && proposal[:summary][:fingerprint] == run.diff_summary["fingerprint"]
          raise StaleReview, "Results or snapshots changed. Refresh the preview before approving."
        end
        # Approval can acknowledge a relabel or a count drop, never malformed
        # medals, unknown provenance, or protected-row conflicts.
        raise InvalidReview, "Resolve blocking guard failures before approving" if @blocking_guards.any?
        apply_changes!
        run.update!(status: "applied", applied_at: Time.current, approved_by: user,
          diff_summary: run.diff_summary.merge("unlinked_competitors" => @unlinked || []))
        @event.update_columns(results_sync_status: "applied", results_last_checked_at: Time.current, results_sync_run_id: run.id)
        run
      end
      notify(result)
      result
    rescue StaleReview, InvalidReview
      raise
    rescue StandardError => e
      record_failure(e, trigger: "manual")
    end

    def discard!(run)
      @event.with_lock do
        run.reload
        raise InvalidReview, "This review is no longer awaiting approval" unless run.event_id == @event.id && run.status == "held" && run.discarded_at.nil?
        run.update!(discarded_at: Time.current)
        @event.update_columns(results_sync_status: "held", results_sync_run_id: run.id)
      end
      run
    end

    private

    def with_evidence_lock(&block)
      @event.with_lock { EvidenceLock.for_event(@event, &block) }
    end

    def build_proposal
      @assembly = ResultsAssembler.new(@event).call
      @identity_keys = {}
      @ambiguous_relabels = []
      @existing = @event.event_results.order(:id).to_a
      @incoming = @assembly.rows.map { |attrs| EventResult.new(attrs.merge(event: @event)) }
      @added, @removed, @changed, @unchanged, @conflicts, @relabels = [], [], [], [], [], []
      match_rows
      check_guards
      totals = { added: @added.size, removed: @removed.size, changed: @changed.size, unchanged: @unchanged.size }
      divisions = {}
      { added: @added, removed: @removed, changed: @changed.map(&:last), unchanged: @unchanged.map(&:last) }.each do |type, rows|
        rows.each do |row|
          key = "#{row.asjjf_event_id}:#{row.discipline}:#{ResultsIdentity.division_key(row.division)}"
          divisions[key] ||= { division: row.division, asjjf_event_id: row.asjjf_event_id, added: 0, removed: 0, changed: 0, unchanged: 0 }
          divisions[key][type] += 1
        end
      end
      relabel_count = @relabels.map { |_, row| [ row.asjjf_event_id, row.division_key ] }.uniq.size
      messages = []
      messages << "Adds #{totals[:added]} results across #{@added.map(&:division).uniq.size} divisions" if totals[:added].positive?
      messages << "Removes #{totals[:removed]} results" if totals[:removed].positive?
      messages << "Updates #{totals[:changed]} results" if totals[:changed].positive?
      messages << "Corrects #{relabel_count} divisions labeled Gi that are actually No-Gi" if relabel_count.positive?
      messages << "No changes to published results" if !changes? && @conflicts.empty?
      fingerprint = Digest::SHA256.hexdigest([
        @assembly.evidence.sort_by { |item| item["id"] },
        @event.attributes.slice("asjjf_event_ids", "registration_url_gi", "registration_url_nogi"),
        @event.event_asjjf_sources.order(:id).pluck(:asjjf_event_id, :discipline),
        @existing.map { |row| row.attributes.sort.to_h }
      ].to_json)
      { summary: totals.merge(divisions: divisions.values, relabeled_divisions: relabel_count,
          messages: messages, conflicts: @conflicts, missing: @assembly.missing,
          expected_pages: @assembly.expected_pages.sort_by(&:to_s), snapshot_ids: @assembly.snapshot_ids, fingerprint: fingerprint, approvable: @assembly.complete? && @blocking_guards.empty?,
          first_import: @existing.none? { |row| row.source == "asjjf" }) }
    end

    def match_rows
      pool = @existing.dup
      pending = @incoming.dup
      pairs = []
      # Exact provenance first, then conservative unique legacy matches, then
      # label-only repairs. Arrays preserve tied bronze and duplicate-name rows.
      [ :exact, :legacy, :relabel ].each do |mode|
        pending.dup.each do |row|
          candidates = pool.select { |old| matches_row?(old, row, mode) }
          next if candidates.empty?
          # Historical double-Gi imports can contain the same athlete/place in
          # both disciplines. Pair the exact Gi label first, then repair the
          # remaining occurrence as No-Gi; occurrence counts retain tied rows.
          if mode == :relabel && candidates.map { |old| identity_key(old) }.uniq.size > 1
            @ambiguous_relabels << "Ambiguous label repair for #{row.competitor_name} in #{row.division}; review historical source attribution"
            next
          end
          old = candidates.first
          pool.delete(old)
          pending.delete(row)
          pairs << [ old, row ]
          @relabels << [ old, row ] if mode == :relabel && row.discipline == "nogi" && old.discipline == "gi"
        end
      end
      pairs.each do |old, row|
        if protected?(old)
          @conflicts << conflict(old, "Protected result matches ASJJF; kept unchanged") unless same?(old, row)
          @unchanged << [ old, row ]
        elsif same?(old, row)
          @unchanged << [ old, row ]
        else
          @changed << [ old, row ]
        end
      end
      pool.each do |row|
        if protected?(row)
          @conflicts << conflict(row, "Protected result is absent from ASJJF; kept unchanged") if row.source == "asjjf"
        else
          @removed << row
        end
      end
      @added = pending
    end

    def matches_row?(old, row, mode)
      old_key = old.sync_key.presence || identity_key(old)
      key = identity_key(row)
      case mode
      when :exact
        old_key == key || (old.source == "manual" && identity_key(old, source: false) == identity_key(row, source: false))
      when :legacy
        old.asjjf_event_id.nil? && (old.discipline.nil? || old.discipline == row.discipline) &&
          identity_key(old, source: false, discipline: false) == identity_key(row, source: false, discipline: false)
      when :relabel
        old.source == "asjjf" && (old.asjjf_event_id.nil? || old.asjjf_event_id == row.asjjf_event_id) &&
          identity_key(old, source: false, discipline: false) == identity_key(row, source: false, discipline: false)
      end
    end

    def identity_key(row, source: true, discipline: true)
      full = @identity_keys[row.object_id] ||= ResultsIdentity.key(row)
      (source ? [ full[0] ] : []) + (discipline ? [ full[1] ] : []) + full.drop(2)
    end

    def protected?(row)
      row.source == "manual" || row.manually_edited_at.present?
    end

    def same?(old, row)
      FIELDS.all? { |field| old.public_send(field) == row.public_send(field) }
    end

    def conflict(row, reason)
      { id: row.id, division: row.division, competitor_name: row.competitor_name, reason: reason }
    end

    def check_guards
      @blocking_guards = @assembly.guard_failures.dup + @ambiguous_relabels
      @incoming.each do |row|
        @blocking_guards << "Missing placement or competitor name in #{row.division}" unless [ 1, 2, 3 ].include?(row.placement) && row.competitor_name.present?
      end
      @incoming.group_by { |row| [ row.asjjf_event_id, row.discipline, row.division_key ] }.each_value do |rows|
        counts = rows.map(&:placement).tally
        if counts.fetch(1, 0) != 1 || counts.fetch(2, 0) > 1 || counts.fetch(3, 0) > 2
          @blocking_guards << "Invalid medal counts in #{rows.first.division} (#{counts})"
        end
      end
      @blocking_guards << "#{@conflicts.size} protected result conflicts require resolution" if @conflicts.any?
      # Also protect public display from collisions with manually curated medals.
      projected = @existing.select { |row| protected?(row) } + @incoming.reject do |row|
        (@unchanged + @changed).any? { |old, incoming| incoming.equal?(row) && protected?(old) }
      end
      projected.group_by(&:division).each do |division, rows|
        if rows.count { |row| row.placement == 1 } > 1 || rows.count { |row| row.placement == 2 } > 1 || rows.count { |row| row.placement == 3 } > 2
          @blocking_guards << "Published division would have duplicate medals: #{division}"
        end
      end
      @guards = @blocking_guards.dup
      current = @existing.select { |row| row.source == "asjjf" }
      if current.any? { |row| row.asjjf_event_id.nil? } && changes?
        @guards << "Historical result provenance is uncertain; review the first adoption before changing or removing legacy rows"
      end
      @guards << "ASJJF result count drops by more than 10% (#{current.size} to #{@incoming.size})" if current.any? && @incoming.size < current.size * 0.9
      current.group_by(&:asjjf_event_id).each do |id, rows|
        next if id.nil?
        @guards << "Source #{id} returned zero results (previously #{rows.size})" if @incoming.none? { |row| row.asjjf_event_id == id }
      end
      if @relabels.any? && !@event.results_sync_runs.where(status: "applied").where.not(approved_by_id: nil).where("(diff_summary->>'relabeled_divisions')::integer > 0").exists?
        @guards << "First No-Gi relabel requires administrator approval"
      end
      @guards.uniq!
      @blocking_guards.uniq!
    end

    def changes?
      @added.any? || @removed.any? || @changed.any?
    end

    def apply_changes!
      previous_ids = @existing.filter_map(&:competitor_id)
      @removed.each(&:destroy!)
      CompetitorLinker.with_legacy_name_index do
        (@changed + @added.map { |row| [ nil, row ] }).each do |old, row|
          target = old || @event.event_results.new
          target.assign_attributes(row.attributes.slice(*FIELDS))
          target.sync_key = identity_key(row)
          target.competitor = CompetitorLinker.find_or_create(target.competitor_name, target)
          target.save!
        end
      end
      # Never relink protected or unchanged rows during sync.
      @unlinked = unlinked_report
      Competitor.where(id: previous_ids.uniq).find_each(&:refresh_current_academy!)
      @event.update_columns(results_imported_at: Time.current)
    end

    def unlinked_report
      @event.event_results.where(source: "asjjf", competitor_id: nil).pluck(:id, :competitor_name).map do |id, name|
        { id: id, competitor_name: name, reason: "Ambiguous, truncated, or incompatible identity; left unlinked" }
      end
    end

    def record_run(status, trigger, proposal)
      summary = proposal[:summary].merge(unlinked_competitors: @unlinked || unlinked_report)
      # The event/evidence locks serialize snapshot and scheduled evaluations. Only
      # the latest still-incomplete run can accumulate arrivals for this page set.
      latest = @event.results_sync_runs.order(id: :desc).first if status == "incomplete"
      if latest&.status == "incomplete" && latest.diff_summary["expected_pages"] == summary[:expected_pages]
        summary[:evaluations] = latest.diff_summary.fetch("evaluations", 1).to_i + 1
        latest.update!(diff_summary: summary, guard_failures: @guards, updated_at: Time.current)
        run = latest
      else
        summary[:evaluations] = 1 if status == "incomplete"
        run = @event.results_sync_runs.create!(trigger: trigger, status: status, diff_summary: summary,
          guard_failures: @guards, applied_at: status == "applied" ? Time.current : nil)
      end
      @event.update_columns(results_sync_status: status, results_last_checked_at: Time.current, results_sync_run_id: run.id)
      run
    end

    def record_failure(error, trigger:)
      failed = @event.results_sync_runs.create!(trigger: trigger, status: "failed", error: "#{error.class}: #{error.message}".truncate(2000))
      @event.update_columns(results_sync_status: "failed", results_last_checked_at: Time.current, results_sync_run_id: failed.id)
      ResultsAlert.deliver(failed)
      failed
    end

    def notify(run)
      return unless run.previously_new_record? || run.saved_change_to_status?
      if run.status == "held" || (run.status == "applied" && run.diff_summary["first_import"])
        ResultsAlert.deliver(run)
      end
    end
  end
end
