require "test_helper"

class AsjjfCalendarAdminTest < ActionDispatch::IntegrationTest
  setup do
    @user = User.create!(clerk_id: "b6-staff", email: "b6@example.com", role: "staff", invitation_status: "accepted")
    org = Organization.create!(name: "Marianas", slug: "marianas-open")
    @event = org.events.create!(name: "Calendar event", status: "upcoming", venue_name: "Old")
    saved = AsjjfSnapshot.create!(url: "https://asjjf.org/main/eventsBySeason/381", asjjf_id: 381, page_type: "season_calendar", html: "saved",
      source: "admin_upload", outcome: "ok", parse_status: "parsed", fetched_at: Time.current)
    AsjjfCalendarRun.create!(snapshot: saved, season_id: 381, season_year: 2027)
    @review = AsjjfCalendarReview.create!(snapshot: saved, event: @event, title: @event.name, kind: "change", fingerprint: "admin-test",
      old_values: { venue_name: "Old" }, new_values: { venue_name: "New" })
    @headers = { "Authorization" => "Bearer b6" }
    @verify = ClerkAuth.method(:verify)
    ClerkAuth.define_singleton_method(:verify) { |_| { "sub" => "b6-staff", "email" => "b6@example.com" } }
  end

  teardown { ClerkAuth.define_singleton_method(:verify, @verify) }

  test "staff reads bounded calendar reviews but only admin can decide" do
    get "/api/v1/admin/asjjf/calendar?per_page=10000", headers: @headers
    assert_response :success
    assert_equal 50, response.parsed_body["per_page"]
    assert_equal @review.id, response.parsed_body["reviews"].first["id"]
    assert_equal "Old", response.parsed_body["reviews"].first["old_values"]["venue_name"]
    assert response.parsed_body["last_checked_at"]
    post decision_path, headers: @headers, params: { decision: "apply" }, as: :json
    assert_response :forbidden
    @user.update!(role: "admin")
    post decision_path, headers: @headers, params: { decision: "apply" }, as: :json
    assert_response :success
    assert_equal "New", @event.reload.venue_name
    post decision_path, headers: @headers, params: { decision: "dismiss" }, as: :json
    assert_response :unprocessable_entity
  end

  test "dismiss retains event, invalid decision and stale apply do not mutate" do
    @user.update!(role: "admin")
    post decision_path, headers: @headers, params: { decision: "delete" }, as: :json
    assert_response :unprocessable_entity
    @event.update!(venue_name: "Staff edit")
    post decision_path, headers: @headers, params: { decision: "apply" }, as: :json
    assert_response :unprocessable_entity
    post decision_path, headers: @headers, params: { decision: "dismiss" }, as: :json
    assert_response :success
    assert_equal "Staff edit", @event.reload.venue_name
    get "/api/v1/admin/asjjf/calendar", headers: @headers
    assert_empty response.parsed_body["reviews"]
  end

  test "viewer reads without deciding and anonymous cannot read or decide" do
    @user.update!(role: "viewer")
    get "/api/v1/admin/asjjf/calendar", headers: @headers
    assert_response :success
    post decision_path, headers: @headers, params: { decision: "dismiss" }, as: :json
    assert_response :forbidden
    assert_equal "Viewer access is read-only", response.parsed_body["error"]
    assert_equal "pending", @review.reload.status
    get "/api/v1/admin/asjjf/calendar"
    assert_response :unauthorized
    post decision_path, params: { decision: "apply" }, as: :json
    assert_response :unauthorized
  end

  private

  def decision_path
    "/api/v1/admin/asjjf/calendar/#{@review.id}/decide"
  end
end
