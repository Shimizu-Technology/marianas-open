class ParseAsjjfSnapshotJob < ApplicationJob
  queue_as :default

  def perform(snapshot_id)
    snapshot = AsjjfSnapshot.find(snapshot_id)
    return unless snapshot.outcome == "ok"
    parsed = Asjjf::Parsers.parse(page_type: snapshot.page_type, html: snapshot.html, url: snapshot.url)
    snapshot.update!(parsed_summary: parsed, parse_status: "parsed", parsed_at: Time.current, parse_error: nil)
    discipline = parsed[:discipline] || parsed["discipline"]
    if %w[event_info event_results].include?(snapshot.page_type) && %w[gi nogi].include?(discipline)
      EventAsjjfSource.where(asjjf_event_id: snapshot.asjjf_id, discipline: "unknown").update_all(discipline: discipline, updated_at: Time.current)
    end
    return unless snapshot.page_type == "individual_ranking" && snapshot.fetch_requests.where(include_divisions: true).exists?
    Array(parsed[:divisions] || parsed["divisions"]).each do |division|
      id = division[:id] || division["id"] || division[:division_id] || division["division_id"]
      AsjjfFetchRequest.enqueue!(url: Asjjf::Url.build("individual_ranking_division", id), page_type: "individual_ranking_division",
        reason: "division from ranking #{snapshot.asjjf_id}")
    end
  rescue StandardError => e
    snapshot&.update!(parse_status: "failed", parse_error: "#{e.class}: #{e.message}".truncate(2000), parsed_at: Time.current)
    Rails.logger.error("[ASJJF] Snapshot #{snapshot_id} parse failed: #{e.class}: #{e.message}")
  ensure
    if snapshot && %w[event_results results_list].include?(snapshot.page_type)
      EventAsjjfSource.where(asjjf_event_id: snapshot.asjjf_id).pluck(:event_id).uniq.each do |event_id|
        EvaluateResultsSyncJob.perform_later(event_id)
      end
    end
  end
end
