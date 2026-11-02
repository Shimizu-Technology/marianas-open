class ParseAsjjfSnapshotJob < ApplicationJob
  queue_as :default

  def perform(snapshot_id)
    snapshot = AsjjfSnapshot.find(snapshot_id)
    Asjjf::EvidenceLock.synchronize([ snapshot.asjjf_id ]) do
      snapshot.reload
      parse_snapshot(snapshot)
    end
    enqueue_ranking_divisions(snapshot)
    ApplyAsjjfCalendarJob.perform_later(snapshot.id) if snapshot.page_type == "season_calendar" && snapshot.parse_status == "parsed"
  rescue StandardError => e
    snapshot&.update!(parse_status: "failed", parse_error: "#{e.class}: #{e.message}".truncate(2000), parsed_at: Time.current)
    Rails.logger.error("[ASJJF] Snapshot #{snapshot_id} parse failed: #{e.class}: #{e.message}")
  ensure
    ApplyRankingSnapshotJob.perform_later(snapshot.id) if snapshot && %w[individual_ranking individual_ranking_division team_ranking].include?(snapshot.page_type)
    if snapshot && %w[event_results results_list].include?(snapshot.page_type)
      EventAsjjfSource.where(asjjf_event_id: snapshot.asjjf_id).pluck(:event_id).uniq.each do |event_id|
        EvaluateResultsSyncJob.perform_later(event_id)
      end
    end
  end

  private

  def parse_snapshot(snapshot)
    return unless snapshot.outcome == "ok"
    parsed = Asjjf::Parsers.parse(page_type: snapshot.page_type, html: snapshot.html, url: snapshot.url)
    snapshot.update!(parsed_summary: parsed.merge(snapshot.parsed_summary.slice("fetch_metadata")), parse_status: "parsed", parsed_at: Time.current, parse_error: nil)
    Asjjf::RankingDiscovery.call(snapshot)
    discipline = parsed[:discipline] || parsed["discipline"]
    if %w[event_info event_results].include?(snapshot.page_type) && %w[gi nogi].include?(discipline)
      EventAsjjfSource.where(asjjf_event_id: snapshot.asjjf_id, discipline: "unknown").update_all(discipline: discipline, updated_at: Time.current)
    end
  end

  def enqueue_ranking_divisions(snapshot)
    return unless snapshot.outcome == "ok" && snapshot.parse_status == "parsed"
    parsed = snapshot.parsed_summary
    return unless snapshot.page_type == "individual_ranking" && snapshot.fetch_requests.where(include_divisions: true).exists?
    Array(parsed[:divisions] || parsed["divisions"]).each do |division|
      id = division[:id] || division["id"] || division[:division_id] || division["division_id"]
      AsjjfFetchRequest.enqueue!(url: Asjjf::Url.build("individual_ranking_division", id), page_type: "individual_ranking_division",
        reason: "division from ranking #{snapshot.asjjf_id}")
    end
  end
end
