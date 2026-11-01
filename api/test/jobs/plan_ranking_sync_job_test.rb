require "test_helper"

class PlanRankingSyncJobTest < ActiveSupport::TestCase
  setup do
    AsjjfRankingSeason.destroy_all
    @season = AsjjfRankingSeason.create!(season_year: 2026, gi_ranking_id: 227, nogi_ranking_id: 234, team_ranking_id: 227, current: true)
    @season.sync_lists!
    @organization = Organization.create!(name: "Planning", slug: "planning")
  end

  test "weekly during active season and never daily or while pending" do
    travel_to Time.zone.local(2026, 6, 15, 23) do
      2.times { PlanRankingSyncJob.perform_now }
      assert_equal 4, AsjjfFetchRequest.count
      assert_equal 2, AsjjfFetchRequest.where(page_type: "individual_ranking", include_divisions: true).count
      first = @season.reload.last_planned_at
      AsjjfFetchRequest.update_all(status: "done")
      travel 6.days
      PlanRankingSyncJob.perform_now
      assert_equal first, @season.reload.last_planned_at
      travel 1.day
      PlanRankingSyncJob.perform_now
      assert_equal 8, AsjjfFetchRequest.count
    end
  end

  test "recent applied results get one extra plan within three days including off season" do
    travel_to Time.zone.local(2026, 11, 2, 23) do
      @season.update!(last_planned_at: 1.day.ago)
      event = @organization.events.create!(name: "Recent event", slug: "recent", date: Date.new(2026, 10, 31), results_imported_at: 2.days.ago)
      PlanRankingSyncJob.perform_now
      assert_equal 4, AsjjfFetchRequest.count
      AsjjfFetchRequest.update_all(status: "done")
      PlanRankingSyncJob.perform_now
      assert_equal 4, AsjjfFetchRequest.count
      event.update!(results_imported_at: 1.hour.ago)
      PlanRankingSyncJob.perform_now
      assert_equal 8, AsjjfFetchRequest.count
    end
  end

  test "unconfirmed seasons old results and off-season weekly planning are ignored" do
    travel_to Time.zone.local(2027, 1, 2, 23) do
      @organization.events.create!(name: "Old event", slug: "old", date: Date.new(2026, 12, 25), results_imported_at: 4.days.ago)
      PlanRankingSyncJob.perform_now
      assert_equal 0, AsjjfFetchRequest.count
    end
  end
end
