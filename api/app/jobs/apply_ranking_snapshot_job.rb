class ApplyRankingSnapshotJob < ApplicationJob
  queue_as :default

  def perform(snapshot_id, allow_reduction: false)
    snapshot = AsjjfSnapshot.find(snapshot_id)
    outcome = Asjjf::RankingSnapshotApplier.new(snapshot, allow_reduction: allow_reduction).call
    snapshot.update!(ranking_apply_status: outcome.to_s, ranking_apply_error: nil, ranking_applied_at: Time.current)
  rescue Asjjf::RankingSnapshotApplier::IncompleteSnapshot, ActiveRecord::RecordInvalid, KeyError => e
    snapshot&.update!(ranking_apply_status: "rejected", ranking_apply_error: e.message.truncate(2000))
    Rails.logger.error("[ASJJF] Ranking snapshot #{snapshot_id} not applied: #{e.class}: #{e.message}")
  end
end
