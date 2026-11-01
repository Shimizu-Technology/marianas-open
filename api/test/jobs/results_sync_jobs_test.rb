require "test_helper"
require_relative "../support/results_snapshot_fixtures"

class ResultsSyncJobsTest < ActiveSupport::TestCase
  include ActiveJob::TestHelper
  include ResultsSnapshotFixtures

  setup do
    @org = Organization.create!(name: "Automation", slug: "automation")
    @event = @org.events.create!(name: "Automation", slug: "automation", date: 2.days.ago, status: "completed")
  end

  test "snapshot parsing enqueues per matching event including failed parse" do
    @event.event_asjjf_sources.create!(asjjf_event_id: 2062, discipline: "unknown", derived_from: "admin")
    page = save_page(id: 2062, type: "event_results", summary: {}, parse_status: "pending",
      html: File.read(Rails.root.join("test/fixtures/files/asjjf/event_results_2062_gi.html")))
    assert_enqueued_with(job: EvaluateResultsSyncJob, args: [ @event.id ]) { ParseAsjjfSnapshotJob.perform_now(page.id) }
    assert_equal "parsed", page.reload.parse_status
    assert_equal "gi", @event.event_asjjf_sources.first.discipline
    page.update!(html: "invalid results")
    assert_enqueued_with(job: EvaluateResultsSyncJob, args: [ @event.id ]) { ParseAsjjfSnapshotJob.perform_now(page.id) }
    assert_equal "failed", page.reload.parse_status
  end

  test "planner handles daily weekly catch-up boundaries and dedupes pending work" do
    travel_to Time.utc(2026, 11, 2, 0, 0) do
      today = Time.current.in_time_zone("Pacific/Guam").to_date
      events = [ 0, 1, 21, 22, 60, 61, 400 ].to_h do |days|
        event = @org.events.create!(name: "Day #{days}", slug: "day-#{days}", date: today - days, end_date: today - days, status: "completed")
        event.event_asjjf_sources.create!(asjjf_event_id: 3000 + days, discipline: "gi", derived_from: "admin")
        event.event_results.create!(division: "Manual", placement: 1, competitor_name: "Existing") unless days == 400
        [ days, event ]
      end
      PlanResultsSyncJob.perform_now
      assert_equal [ 1, 21, 22, 60, 400 ], events.filter_map { |days, event| days if event.reload.results_fetch_planned_at }
      assert_equal 25, AsjjfFetchRequest.count
      PlanResultsSyncJob.perform_now
      assert_equal 25, AsjjfFetchRequest.count
      AsjjfFetchRequest.update_all(status: "done")
      travel 1.day
      PlanResultsSyncJob.perform_now
      # Day 0 becomes eligible, day 1 remains daily, and catch-up remains daily.
      # The former day-21 event has moved into the weekly window.
      assert_equal 40, AsjjfFetchRequest.count
      travel 6.days
      PlanResultsSyncJob.perform_now
      assert events[22].reload.results_fetch_planned_at > 6.days.ago
      assert_not events[61].reload.results_fetch_planned_at
    end
  end

  test "first applied import and unique holds alert; no-change and subsequent updates are quiet" do
    complete_snapshots(@event)
    sent = []
    original = Asjjf::ResultsAlert.method(:deliver)
    Asjjf::ResultsAlert.define_singleton_method(:deliver) { |run| sent << run.status }
    assert_equal "applied", sync(@event).status
    assert_equal [ "applied" ], sent
    assert_equal "no_changes", sync(@event).status
    @event.event_results.first.update_columns(academy: "Old academy")
    assert_equal "applied", sync(@event).status
    assert_equal [ "applied" ], sent
    @event.event_results.first.update!(manually_edited_at: Time.current, academy: "Staff academy")
    2.times { assert_equal "held", sync(@event).status }
    assert_equal %w[applied held], sent
  ensure
    Asjjf::ResultsAlert.define_singleton_method(:deliver, original) if original
  end

  test "failed sync sends an alert and email delivery uses configured Resend recipients" do
    complete_snapshots(@event)
    original_link = CompetitorLinker.method(:find_or_create)
    CompetitorLinker.define_singleton_method(:find_or_create) { |*| raise "Fixture failure" }
    original_send = Resend::Emails.method(:send)
    sent = []
    Resend::Emails.define_singleton_method(:send) { |message| sent << message }
    keys = %w[ASJJF_ALERT_EMAILS RESEND_API_KEY RESEND_FROM_EMAIL]
    previous = keys.to_h { |key| [ key, ENV[key] ] }
    ENV["ASJJF_ALERT_EMAILS"] = "first@example.com, second@example.com"
    ENV["RESEND_API_KEY"] = "fixture-only"
    ENV["RESEND_FROM_EMAIL"] = "fixture@example.com"
    assert_equal "failed", sync(@event).status
    assert_equal 1, sent.size
    assert_equal %w[first@example.com second@example.com], sent.first[:to]
    assert_includes sent.first[:subject], "failed"
    assert_includes sent.first[:text], "Fixture failure"
  ensure
    CompetitorLinker.define_singleton_method(:find_or_create, original_link) if original_link
    Resend::Emails.define_singleton_method(:send, original_send) if original_send
    previous&.each { |key, value| value.nil? ? ENV.delete(key) : ENV[key] = value }
  end
end
