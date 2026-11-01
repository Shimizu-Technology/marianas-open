require "test_helper"

class AsjjfSnapshotJobsTest < ActiveSupport::TestCase
  test "retention keeps latest successful URL forever and nullifies old request pointers" do
    old = snapshot(fetched_at: 150.days.ago)
    latest = snapshot(fetched_at: 130.days.ago, parse_status: "failed")
    failed = snapshot(fetched_at: 125.days.ago, outcome: "error", parse_status: "skipped")
    recent = snapshot(fetched_at: 1.day.ago, outcome: "error", parse_status: "skipped", created_at: 1.day.ago)
    request = AsjjfFetchRequest.create!(url: old.url, page_type: old.page_type, status: "done", snapshot: old)
    PruneAsjjfSnapshotsJob.perform_now
    assert_equal [ latest.id, recent.id ].sort, AsjjfSnapshot.pluck(:id).sort
    assert_nil request.reload.snapshot_id
    assert_not AsjjfSnapshot.exists?(failed.id)
  end

  test "parsed ranking index enqueues its divisions only when requested" do
    planner = Asjjf::FetchPlanner.new
    requests = planner.plan_ranking(227)
    index = requests.find { |request| request.page_type == "individual_ranking" }
    html = File.read(Rails.root.join("test/fixtures/files/asjjf/individual_ranking_227.html"))
    AsjjfFetchRequest.lease!(fetcher_id: "home")
    snapshot = Asjjf::SnapshotIntake.call(request_id: index.id, fetcher_id: "home", url: index.url, final_url: index.url, html: html)
    assert_equal "parsed", snapshot.parse_status
    assert_equal 85, AsjjfFetchRequest.where(page_type: "individual_ranking_division").count
    ParseAsjjfSnapshotJob.perform_now(snapshot.id)
    assert_equal 85, AsjjfFetchRequest.where(page_type: "individual_ranking_division").count
  end

  test "deduplication promotes an index-only plan to include division pages" do
    planner = Asjjf::FetchPlanner.new
    original = planner.plan_ranking(227, include_divisions: false).first
    promoted = planner.plan_ranking(227, include_divisions: true).first
    assert_equal original.id, promoted.id
    assert promoted.include_divisions?
    AsjjfFetchRequest.lease!(fetcher_id: "home")
    snapshot = Asjjf::SnapshotIntake.call(request_id: promoted.id, fetcher_id: "home", url: promoted.url, final_url: promoted.url,
      html: File.read(Rails.root.join("test/fixtures/files/asjjf/individual_ranking_227.html")))
    assert_equal "parsed", snapshot.parse_status
    assert_equal 85, AsjjfFetchRequest.where(page_type: "individual_ranking_division").count
    assert AsjjfFetchRequest.exists?(page_type: "team_ranking", url: "https://asjjf.org/ranking/teamRank/227?rankType=kids")
  end

  test "user deletion preserves uploaded snapshots with a nullable attribution" do
    user = User.create!(clerk_id: "snapshot-uploader", email: "uploader@example.com", role: "staff")
    saved = snapshot(source: "admin_upload", uploaded_by_user: user)
    user.destroy!
    assert AsjjfSnapshot.exists?(saved.id)
    assert_nil saved.reload.uploaded_by_user_id
  end

  test "index-only planner and admin snapshots do not fan out" do
    request = Asjjf::FetchPlanner.new.plan_ranking(227, include_divisions: false).find { |item| item.page_type == "individual_ranking" }
    AsjjfFetchRequest.lease!(fetcher_id: "home")
    Asjjf::SnapshotIntake.call(request_id: request.id, fetcher_id: "home", url: request.url, final_url: request.url, html: File.read(Rails.root.join("test/fixtures/files/asjjf/individual_ranking_227.html")))
    assert_equal 0, AsjjfFetchRequest.where(page_type: "individual_ranking_division").count
  end

  private

  def snapshot(**overrides)
    AsjjfSnapshot.create!({ url: "https://asjjf.org/main/eventInfo/1", page_type: "event_info", html: "<html>saved</html>", outcome: "ok", fetched_at: 130.days.ago, source: "fetcher", parse_status: "parsed", created_at: 130.days.ago }.merge(overrides))
  end
end
