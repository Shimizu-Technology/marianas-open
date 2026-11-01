module Identity
  class CompetitorMerge
    class << self
      def preview(source, target)
        validate_pair!(source, target)
        details = {
          source: { id: source.id, name: source.full_name },
          target: { id: target.id, name: target.full_name },
          results_count: EventResult.where(competitor_id: source.id).count,
          warnings: HistoryCheck.call(source, target),
          blocked: source.identity_separate? || target.identity_separate?
        }
        details.merge(review_token: verifier.generate(review_payload(details), purpose: "competitor_merge", expires_in: 15.minutes))
      end

      def call(source:, target:, confirm:, confirm_warnings: false, actor: nil, review_token: nil)
        raise ArgumentError, "Explicit confirmation is required" unless confirm == true
        validate_pair!(source, target)
        Competitor.transaction do
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
          if details[:warnings].any? && confirm_warnings != true
            raise ArgumentError, "Review and explicitly confirm history warnings: #{details[:warnings].join('; ')}"
          end
          EventResult.where(competitor_id: source.id).update_all(competitor_id: target.id)
          source.destroy!
          target.refresh_current_academy!
          audit = details.except(:review_token).merge(action: "identity.competitor_merge", actor_id: actor&.id)
          ActiveRecord.after_all_transactions_commit { Rails.logger.info(audit.to_json) }
          target.reload
        end
      end

      private

      def verifier
        Rails.application.message_verifier("identity-competitor-merge")
      end

      def review_payload(details)
        details.slice(:source, :target, :results_count, :blocked).merge(warnings: details[:warnings].sort).deep_stringify_keys
      end

      def validate_pair!(source, target)
        unless source.is_a?(Competitor) && target.is_a?(Competitor) && source.persisted? && target.persisted? && source.id != target.id
          raise ArgumentError, "Choose two different persisted athletes"
        end
      end
    end
  end
end
