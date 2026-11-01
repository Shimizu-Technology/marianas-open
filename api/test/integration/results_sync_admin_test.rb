require "test_helper"
require_relative "../support/results_snapshot_fixtures"

class ResultsSyncAdminTest < ActionDispatch::IntegrationTest
  include ResultsSnapshotFixtures

  setup do
    @org = Organization.create!(name: "Sync admin", slug: "sync-admin")
    @event = @org.events.create!(name: "Sync admin", slug: "sync-admin", status: "completed")
    @user = User.create!(email: "sync@example.com", clerk_id: "sync-admin", role: "staff")
    @headers = { "Authorization" => "Bearer test_token_#{@user.id}" }
    complete_snapshots(@event)
  end

  test "staff previews saved diff but only admin can approve or discard" do
    get "/api/v1/admin/events/#{@event.id}/import_results_preview", headers: @headers
    assert_response :success
    run = response.parsed_body["run"]
    assert_equal "held", run["status"]
    assert_empty @event.event_results
    %w[approve discard].each do |action|
      post "/api/v1/admin/events/#{@event.id}/results_sync/#{run['id']}/#{action}", headers: @headers
      assert_response :forbidden
    end
    post "/api/v1/admin/events/#{@event.id}/import_results", headers: @headers, params: { run_id: run["id"] }, as: :json
    assert_response :forbidden
    @user.update!(role: "admin")
    post "/api/v1/admin/events/#{@event.id}/results_sync/#{run['id']}/approve", headers: @headers
    assert_response :success
    assert_equal "applied", response.parsed_body["run"]["status"]
    assert @event.event_results.exists?
    assert_equal @user.id, ResultsSyncRun.find(run["id"]).approved_by_id
    get "/api/v1/admin/events/#{@event.id}/results_sync", headers: @headers
    assert_response :success
    assert_equal "applied", response.parsed_body["status"]
  end

  test "discard is saved and approval is scoped to event and current evidence" do
    @user.update!(role: "admin")
    post "/api/v1/admin/events/#{@event.id}/results_sync/preview", headers: @headers
    assert_response :success
    run_id = response.parsed_body["run"]["id"]
    other = @org.events.create!(name: "Other", slug: "other")
    post "/api/v1/admin/events/#{other.id}/results_sync/#{run_id}/approve", headers: @headers
    assert_response :not_found
    post "/api/v1/admin/events/#{@event.id}/results_sync/#{run_id}/discard", headers: @headers
    assert_response :success
    assert ResultsSyncRun.find(run_id).discarded_at
    post "/api/v1/admin/events/#{@event.id}/import_results", headers: @headers, params: { run_id: run_id }, as: :json
    assert_response :conflict
    assert_empty @event.event_results
  end

  test "GET preserves a discarded review after an intervening failure" do
    reviewed = sync(@event, apply: false)
    Asjjf::ResultsSync.new(@event).discard!(reviewed)
    original = Asjjf::ResultsAssembler.instance_method(:call)
    Asjjf::ResultsAssembler.define_method(:call) { raise "Transient fixture failure" }
    assert_equal "failed", sync(@event).status
    Asjjf::ResultsAssembler.define_method(:call, original)
    assert_equal reviewed.id, sync(@event).id
    get "/api/v1/admin/events/#{@event.id}/results_sync", headers: @headers
    assert_response :success
    assert_equal reviewed.id, response.parsed_body["run"]["id"]
    assert response.parsed_body["run"]["discarded_at"]
    assert_equal "held", response.parsed_body["status"]
  ensure
    Asjjf::ResultsAssembler.define_method(:call, original) if original
  end

  test "admin edits protect source identity and future manual results default to manual" do
    assert_equal "applied", sync(@event).status
    row = @event.event_results.first
    patch "/api/v1/admin/events/#{@event.id}/results/#{row.id}", headers: @headers,
      params: { event_result: { competitor_name: "Staff corrected name", placement: 2, source: "manual", manually_edited_at: nil } }, as: :json
    assert_response :success
    assert row.reload.manually_edited_at
    assert_equal "asjjf", row.source
    assert row.sync_key
    post "/api/v1/admin/events/#{@event.id}/results", headers: @headers,
      params: { event_result: { competitor_name: "Manual athlete", placement: 1, division: "Manual custom" } }, as: :json
    assert_response :created
    assert_equal "manual", response.parsed_body["source"]
    assert_equal "held", sync(@event).status
    assert_equal "Staff corrected name", row.reload.competitor_name
  end

  test "viewer and anonymous cannot read preview approve or discard" do
    @user.update!(role: "viewer")
    get "/api/v1/admin/events/#{@event.id}/results_sync", headers: @headers
    assert_response :forbidden
    post "/api/v1/admin/events/#{@event.id}/results_sync/preview", headers: @headers
    assert_response :forbidden
    get "/api/v1/admin/events/#{@event.id}/import_results_preview"
    assert_response :unauthorized
  end

  test "public results keep separate Gi and No-Gi divisions without duplicate golds" do
    complete_snapshots(@event, id: 2063, discipline: "nogi")
    assert_equal "applied", sync(@event).status
    get "/api/v1/events/#{@event.slug}/results"
    assert_response :success
    divisions = response.parsed_body
    assert divisions.any? { |division| division["division"].start_with?("[NOGI]") }
    assert divisions.all? { |division| division["results"].count { |row| row["placement"] == 1 } == 1 }
  end
end
