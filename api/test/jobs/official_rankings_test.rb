require "test_helper"

class OfficialRankingsTest < ActiveSupport::TestCase
  include ActiveJob::TestHelper
  setup do
    AsjjfRankingSeason.destroy_all
    @season = AsjjfRankingSeason.create!(season_year: 2026, gi_ranking_id: 227, nogi_ranking_id: 234, team_ranking_id: 227, current: true)
    @season.sync_lists!
  end

  test "real indexes and full division and team tables apply idempotently" do
    index = apply_fixture("individual_ranking_227.html", "individual_ranking", 227)
    nogi = apply_fixture("individual_ranking_234_nogi.html", "individual_ranking", 234)
    list = @season.asjjf_ranking_lists.find_by!(kind: "individual", discipline: "gi")
    assert_equal 85, list.asjjf_ranking_divisions.count
    assert_equal 57, @season.asjjf_ranking_lists.find_by!(kind: "individual", discipline: "nogi").asjjf_ranking_divisions.count
    assert_equal 39, list.asjjf_ranking_entries.count
    division_snapshot = apply_fixture("individual_ranking_division_20401_get.html", "individual_ranking_division", 20401)
    division = list.asjjf_ranking_divisions.find_by!(asjjf_division_id: 20401)
    assert_equal 158, division.asjjf_ranking_entries.count
    assert_equal "FM", division.asjjf_ranking_entries.order(:position, :id).first.country_code
    assert_equal "FSM", division.asjjf_ranking_entries.order(:position, :id).first.raw_country_code
    team_snapshot = apply_fixture("team_rank_227.html", "team_ranking", 227)
    team = @season.asjjf_ranking_lists.find_by!(kind: "team", category: "adult")
    assert_equal 217, team.asjjf_ranking_entries.count
    leader = team.asjjf_ranking_entries.order(:position).first
    assert_equal [ "Biba Jiu Jitsu", BigDecimal("5351") ], [ leader.name, leader.points ]
    ids = AsjjfRankingEntry.order(:id).pluck(:id)
    [ index, nogi, division_snapshot, team_snapshot ].each { |snapshot| ApplyRankingSnapshotJob.perform_now(snapshot.id) }
    assert_equal ids, AsjjfRankingEntry.order(:id).pluck(:id)
    assert_equal "unchanged", team_snapshot.reload.ranking_apply_status
  end

  test "partial zero and malformed replacements retain all previous division data atomically" do
    apply_fixture("individual_ranking_227.html", "individual_ranking", 227)
    source = apply_fixture("individual_ranking_division_20401_get.html", "individual_ranking_division", 20401)
    division = AsjjfRankingDivision.find_by!(asjjf_division_id: 20401)
    original = division.asjjf_ranking_entries.order(:id).pluck(:id)
    [ source.parsed_summary.merge("rows" => []), source.parsed_summary.merge("rows" => [], "counts" => { "rows" => 0 }),
      source.parsed_summary.merge("rows" => source.parsed_summary["rows"].first(1), "counts" => { "rows" => 1 }),
      source.parsed_summary.deep_dup.tap { |data| data["rows"].last["points"] = "-1" } ].each do |summary|
      bad = source.dup
      bad.fetched_at = 1.minute.from_now
      bad.parsed_summary = summary
      bad.save!
      ApplyRankingSnapshotJob.perform_now(bad.id)
      assert_equal "rejected", bad.reload.ranking_apply_status
      assert_equal original, division.asjjf_ranking_entries.order(:id).pluck(:id)
    end
    html = fixture("individual_ranking_division_20401_get.html").split("</table>").first
    failed = snapshot(html, "individual_ranking_division", 20401)
    ParseAsjjfSnapshotJob.perform_now(failed.id)
    assert_equal "failed", failed.reload.parse_status
    ApplyRankingSnapshotJob.perform_now(failed.id)
    assert_equal original, division.asjjf_ranking_entries.order(:id).pluck(:id)
  end

  test "aliases match canonical profiles and academies while ambiguous and separated identities stay unmatched" do
    athlete = Competitor.create!(first_name: "Alpet", last_name: "Jasper")
    CompetitorAlias.create!(competitor: athlete, raw_name: "Old Athlete", source: "manual")
    gym = Academy.create!(name: "Canonical Gym", aliases: [ "Guam Martial Arts Academy" ])
    apply_fixture("individual_ranking_227.html", "individual_ranking", 227)
    source = apply_fixture("individual_ranking_division_20401_get.html", "individual_ranking_division", 20401)
    first = AsjjfRankingDivision.find_by!(asjjf_division_id: 20401).asjjf_ranking_entries.order(:position, :id).first
    assert_equal athlete.id, first.competitor_id
    assert_equal gym.id, first.academy_id
    assert_equal "Alpet Jasper", first.public_json[:display_name]
    changed = source.dup
    changed.fetched_at = 1.minute.from_now
    changed.parsed_summary = source.parsed_summary.deep_dup.tap { |data| data["rows"].first["name"] = "Old Athlete" }
    changed.save!
    ApplyRankingSnapshotJob.perform_now(changed.id)
    assert_equal athlete.id, first.class.where(asjjf_ranking_division_id: first.asjjf_ranking_division_id).order(:position, :id).first.competitor_id
    Competitor.create!(first_name: "Old", last_name: "Athlete")
    ambiguous = changed.dup
    ambiguous.fetched_at = 2.minutes.from_now
    ambiguous.save!
    ApplyRankingSnapshotJob.perform_now(ambiguous.id)
    assert_nil first.class.where(asjjf_ranking_division_id: first.asjjf_ranking_division_id).order(:position, :id).first.competitor_id
  end

  test "reviewed smaller nonempty table can replace standings but empty cannot" do
    source = apply_fixture("team_rank_227.html", "team_ranking", 227)
    smaller = source.dup
    smaller.fetched_at = 1.minute.from_now
    smaller.parsed_summary = source.parsed_summary.merge("rows" => source.parsed_summary["rows"].first(1), "counts" => { "rows" => 1 })
    smaller.save!
    ApplyRankingSnapshotJob.perform_now(smaller.id)
    assert_equal "rejected", smaller.reload.ranking_apply_status
    ApplyRankingSnapshotJob.perform_now(smaller.id, allow_reduction: true)
    assert_equal "applied", smaller.reload.ranking_apply_status
    assert_equal 1, AsjjfRankingEntry.where(asjjf_ranking_list: @season.asjjf_ranking_lists.where(kind: "team", category: "adult")).count
  end

  test "removed index divisions are held until verified and then reconciled atomically" do
    source = apply_fixture("individual_ranking_227.html", "individual_ranking", 227)
    apply_fixture("individual_ranking_division_20401_get.html", "individual_ranking_division", 20401)
    list = @season.asjjf_ranking_lists.find_by!(kind: "individual", discipline: "gi")
    smaller = source.dup
    smaller.fetched_at = 1.minute.from_now
    smaller.parsed_summary = source.parsed_summary.deep_dup.tap do |data|
      data["divisions"].reject! { |division| division["id"] == 20401 }
      data["counts"]["divisions"] = 84
    end
    smaller.save!
    ApplyRankingSnapshotJob.perform_now(smaller.id)
    assert_equal "rejected", smaller.reload.ranking_apply_status
    assert_equal 85, list.asjjf_ranking_divisions.count
    assert_equal 158, list.asjjf_ranking_divisions.find_by!(asjjf_division_id: 20401).asjjf_ranking_entries.count
    ApplyRankingSnapshotJob.perform_now(smaller.id, allow_reduction: true)
    assert_equal "applied", smaller.reload.ranking_apply_status
    assert_equal 84, list.asjjf_ranking_divisions.count
    assert_not list.asjjf_ranking_divisions.exists?(asjjf_division_id: 20401)
    assert_equal 39, list.asjjf_ranking_entries.count
  end

  test "identity merges transfer official standings without changing source facts" do
    source = Competitor.create!(first_name: "Alpet", last_name: "Jasper")
    target = Competitor.create!(first_name: "Alpet New", last_name: "Jasper")
    old_gym = Academy.create!(name: "Old Biba", aliases: [ "Biba Jiu Jitsu" ])
    new_gym = Academy.create!(name: "New Biba")
    apply_fixture("individual_ranking_227.html", "individual_ranking", 227)
    apply_fixture("individual_ranking_division_20401_get.html", "individual_ranking_division", 20401)
    apply_fixture("team_rank_227.html", "team_ranking", 227)
    person_entry = AsjjfRankingEntry.find_by!(competitor: source)
    team_entry = AsjjfRankingEntry.find_by!(academy: old_gym, name: "Biba Jiu Jitsu")
    Identity::CompetitorMerge.call(source: source, target: target, confirm: true, confirm_warnings: true)
    Identity::AcademyMerge.call(source: old_gym, target: new_gym, confirm: true)
    assert_equal target.id, person_entry.reload.competitor_id
    assert_equal new_gym.id, team_entry.reload.academy_id
    assert_equal "Biba Jiu Jitsu", team_entry.name
    assert_equal BigDecimal("5351"), team_entry.points
  end

  test "older snapshots cannot overwrite newer tables and wrong season cannot publish" do
    source = apply_fixture("team_rank_227.html", "team_ranking", 227)
    list = @season.asjjf_ranking_lists.find_by!(kind: "team", category: "adult")
    ids = list.asjjf_ranking_entries.pluck(:id)
    old = source.dup
    old.fetched_at = 1.day.ago
    old.save!
    ApplyRankingSnapshotJob.perform_now(old.id)
    assert_equal ids, list.asjjf_ranking_entries.pluck(:id)
    wrong = source.dup
    wrong.fetched_at = 1.day.from_now
    wrong.parsed_summary = source.parsed_summary.merge("title" => "Marianas Pro Jiu Jitsu Ranking 2027")
    wrong.save!
    ApplyRankingSnapshotJob.perform_now(wrong.id)
    assert_equal "rejected", wrong.reload.ranking_apply_status
    assert_equal ids, list.asjjf_ranking_entries.pluck(:id)
  end

  test "discovery stores menu suggestions without confirming or switching seasons" do
    apply_fixture("individual_ranking_227.html", "individual_ranking", 227)
    assert AsjjfRankingSuggestion.exists?(asjjf_ranking_id: 234, discipline: "nogi", season_year: 2026)
    assert AsjjfRankingSuggestion.exists?(season_year: 2025)
    assert_equal [ 2026 ], AsjjfRankingSeason.pluck(:season_year)
    assert_equal @season, AsjjfRankingSeason.current_season
  end

  test "failed team source is unavailable until captured and never erases existing data" do
    source = snapshot("<html>Login required</html>", "team_ranking", 227)
    ParseAsjjfSnapshotJob.perform_now(source.id)
    ApplyRankingSnapshotJob.perform_now(source.id)
    list = @season.asjjf_ranking_lists.find_by!(kind: "team", category: "adult")
    assert_equal "unavailable", list.reload.status
    apply_fixture("team_rank_227.html", "team_ranking", 227)
    ApplyRankingSnapshotJob.perform_now(source.id)
    assert_equal 217, list.asjjf_ranking_entries.count
    assert_equal "available", list.reload.status
  end

  test "division received before index applies after index mapping is created" do
    source = apply_fixture("individual_ranking_division_20401_get.html", "individual_ranking_division", 20401)
    assert_equal "unconfigured", source.reload.ranking_apply_status
    perform_enqueued_jobs(only: ApplyRankingSnapshotJob) do
      apply_fixture("individual_ranking_227.html", "individual_ranking", 227)
    end
    assert_equal 158, AsjjfRankingDivision.find_by!(asjjf_division_id: 20401).asjjf_ranking_entries.count
  end

  test "retention preserves snapshots referenced by live rankings even when newer fetch failed to parse" do
    source = apply_fixture("team_rank_227.html", "team_ranking", 227)
    source.update_columns(created_at: 150.days.ago, fetched_at: 150.days.ago)
    newer = source.dup
    newer.fetched_at = 140.days.ago
    newer.created_at = 140.days.ago
    newer.save!
    AsjjfSnapshot.prune!
    assert AsjjfSnapshot.exists?(source.id)
  end

  private

  def fixture(file)
    File.read(Rails.root.join("test/fixtures/files/asjjf", file))
  end

  def snapshot(html, page_type, id)
    AsjjfSnapshot.create!(url: Asjjf::Url.build(page_type, id), page_type: page_type, asjjf_id: id, params: {}, html: html,
      source: "admin_upload", fetched_at: Time.current, outcome: "ok", parse_status: "pending")
  end

  def apply_fixture(file, page_type, id)
    saved = snapshot(fixture(file), page_type, id)
    ParseAsjjfSnapshotJob.perform_now(saved.id)
    assert_equal "parsed", saved.reload.parse_status, saved.parse_error
    ApplyRankingSnapshotJob.perform_now(saved.id)
    assert_equal "applied", saved.reload.ranking_apply_status unless page_type == "individual_ranking_division" && !AsjjfRankingDivision.exists?(asjjf_division_id: id)
    saved
  end
end
