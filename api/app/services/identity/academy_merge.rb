module Identity
  class AcademyMerge
    class << self
      def preview(source, target)
        validate_pair!(source, target)
        {
          source: { id: source.id, name: source.name },
          target: { id: target.id, name: target.name },
          results_count: EventResult.where(academy_id: source.id).count,
          athletes_count: Competitor.where(academy_id: source.id).count,
          warnings: [], blocked: false
        }
      end

      def call(source:, target:, confirm:, confirm_warnings: false, actor: nil)
        raise ArgumentError, "Explicit confirmation is required" unless confirm == true
        validate_pair!(source, target)
        Academy.transaction do
          # Lock in ID order so opposite merge requests cannot deadlock.
          records = Academy.where(id: [ source.id, target.id ]).order(:id).lock.to_a
          raise ArgumentError, "Both academies must still exist" unless records.size == 2
          source = records.find { |record| record.id == source.id }
          target = records.find { |record| record.id == target.id }
          details = preview(source, target)
          aliases = (Array(target.aliases) + Array(source.aliases) + [ source.name ]).reject(&:blank?).uniq
          target.parent_id = source.parent_id if target.parent_id == source.id
          target.save!
          target.update_columns(aliases: aliases)
          EventResult.where(academy_id: source.id).update_all(academy_id: target.id)
          Competitor.where(academy_id: source.id).update_all(academy_id: target.id)
          Academy.where(parent_id: source.id).where.not(id: target.id).update_all(parent_id: target.id)
          IdentityReview.where(candidate_academy_id: source.id).update_all(candidate_academy_id: target.id)
          IdentityReview.where(resolved_academy_id: source.id).update_all(resolved_academy_id: target.id)
          source.destroy!
          audit = details.merge(action: "identity.academy_merge", actor_id: actor&.id)
          ActiveRecord.after_all_transactions_commit { Rails.logger.info(audit.to_json) }
          target.reload
        end
      end

      private

      def validate_pair!(source, target)
        unless source.is_a?(Academy) && target.is_a?(Academy) && source.persisted? && target.persisted? && source.id != target.id
          raise ArgumentError, "Choose two different persisted academies"
        end
      end
    end
  end
end
