module Identity
  class CompetitorMerge
    class << self
      def preview(source, target)
        validate_pair!(source, target)
        skipped = CompetitorAlias.name_plan(competitor: target, names: alias_names(source), excluding_competitor_ids: [ source.id ])
          .select { |item| item[:competitor_ids].any? }
        history_warnings = HistoryCheck.call(source, target)
        details = {
          source: { id: source.id, name: source.full_name },
          target: { id: target.id, name: target.full_name },
          results_count: EventResult.where(competitor_id: source.id).count,
          skipped_aliases: skipped,
          history_warnings: history_warnings,
          warnings: history_warnings + skipped.map { |item| "Skip alias #{item[:raw_name].inspect}: matches another athlete (IDs #{item[:competitor_ids].join(', ')})" },
          blocked: source.identity_separate? || target.identity_separate?,
          conflicts: ProfileMerge.conflicts(source, target)
        }
        details.merge(review_token: verifier.generate(review_payload(details), purpose: "competitor_merge", expires_in: 15.minutes))
      end

      def call(source:, target:, confirm:, confirm_warnings: false, actor: nil, review_token: nil, keep: {})
        raise ArgumentError, "Explicit confirmation is required" unless confirm == true
        validate_pair!(source, target)
        Competitor.transaction do
          Competitor.connection.execute("SELECT pg_advisory_xact_lock(184527002)")
          records = Competitor.where(id: [ source.id, target.id ]).order(:id).lock.to_a
          raise ArgumentError, "Both athletes must still exist" unless records.size == 2
          source = records.find { |record| record.id == source.id }
          target = records.find { |record| record.id == target.id }
          # Serialize concurrent result reassignments as well as profile changes.
          EventResult.where(competitor_id: records.map(&:id)).order(:id).lock.load
          details = preview(source, target)
          raise ArgumentError, "Athletes marked as different people cannot be merged" if details[:blocked]
          if review_token.present? && verifier.verified(review_token, purpose: "competitor_merge") != review_payload(details)
            raise ArgumentError, "Merge preview changed or expired; reload it and review the current warnings and counts"
          end
          if details[:history_warnings].any? && confirm_warnings != true
            raise ArgumentError, "Review and explicitly confirm history warnings: #{details[:history_warnings].join('; ')}"
          end
          details[:skipped_aliases] = CompetitorAlias.record_names!(competitor: target, names: alias_names(source), source: "merge", actor: actor, excluding_competitor_ids: [ source.id ])
          discarded = ProfileMerge.apply(source, target, keep: keep)
          EventResult.where(competitor_id: source.id).update_all(competitor_id: target.id)
          # A gym with result history is derived from the latest result, not a
          # profile conflict choice. Retain a blank-profile fallback if no
          # history exists; refresh below remains authoritative when it does.
          target.academy_id ||= source.academy_id
          target.academy = target.academy.presence || source.academy
          source.destroy!
          target.save!
          target.refresh_current_academy! if target.event_results.exists?
          audit = details.except(:review_token).merge(action: "identity.competitor_merge", actor_id: actor&.id, discarded_values: discarded)
          ActiveRecord.after_all_transactions_commit { Rails.logger.info(audit.to_json) }
          target.reload
          target.skipped_aliases = details[:skipped_aliases]
          target
        end
      end

      private

      def verifier
        Rails.application.message_verifier("identity-competitor-merge")
      end

      def review_payload(details)
        details.slice(:source, :target, :results_count, :blocked, :conflicts, :skipped_aliases).merge(warnings: details[:warnings].sort).deep_stringify_keys
      end

      def alias_names(source)
        raw_names = EventResult.where(competitor_id: source.id).pluck(:competitor_name, :raw_competitor_name).flatten.compact
        source.identity_names + source.competitor_aliases.order(:id).pluck(:raw_name) + raw_names + raw_names.map { |name| NameNormalizer.person_parts(name).join(" ") }
      end

      def validate_pair!(source, target)
        unless source.is_a?(Competitor) && target.is_a?(Competitor) && source.persisted? && target.persisted? && source.id != target.id
          raise ArgumentError, "Choose two different persisted athletes"
        end
      end
    end
  end
end
