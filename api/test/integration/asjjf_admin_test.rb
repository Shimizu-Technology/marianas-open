require "test_helper"

class AsjjfAdminTest < ActionDispatch::IntegrationTest
  setup do
    @user = User.create!(clerk_id: "b1-staff", email: "b1@example.com", role: "staff", invitation_status: "accepted")
    org = Organization.create!(name: "B1", slug: "b1")
    @event = org.events.create!(name: "B1 event", slug: "b1-event", asjjf_event_ids: [ 2062 ], registration_url_nogi: "https://asjjf.org/main/eventInfo/2063")
    @headers = { "Authorization" => "Bearer b1" }
    @original_verify = ClerkAuth.method(:verify)
    ClerkAuth.define_singleton_method(:verify) { |_token| { "sub" => "b1-staff", "email" => "b1@example.com" } }
  end

  teardown do
    ClerkAuth.define_singleton_method(:verify, @original_verify)
  end

  test "staff checks event sources with deduped queue and reads status" do
    2.times do
      post "/api/v1/admin/events/#{@event.id}/asjjf_check", headers: @headers
      assert_response :success
      assert_equal 12, response.parsed_body["queued_count"]
    end
    assert_equal 12, AsjjfFetchRequest.count
    assert_equal "unknown", @event.event_asjjf_sources.find_by!(asjjf_event_id: 2062).discipline
    assert_equal "nogi", @event.event_asjjf_sources.find_by!(asjjf_event_id: 2063).discipline
    get "/api/v1/admin/asjjf/status", headers: @headers
    assert_response :success
    assert_equal 12, response.parsed_body.dig("queue_counts", "pending")
    assert_not response.parsed_body.dig("breaker", "open")
    assert_equal [], response.parsed_body["recent_snapshots"]
  end

  test "saved page upload follows parser path and records uploader; invalid type and URL rejected" do
    upload = fixture_file_upload("asjjf/event_results_2062_gi.html", "text/html")
    post "/api/v1/admin/asjjf/snapshots", params: { file: upload, page_type: "event_results", url: "https://asjjf.org/main/eventResults/2062" }, headers: @headers
    assert_response :created
    assert_equal "parsed", response.parsed_body["parse_status"]
    snapshot = AsjjfSnapshot.last
    assert_equal "admin_upload", snapshot.source
    assert_equal @user.id, snapshot.uploaded_by_user_id
    post "/api/v1/admin/asjjf/snapshots", params: { file: upload, page_type: "event_results", url: "https://evil.org/main/eventResults/2062" }, headers: @headers
    assert_response :unprocessable_entity
    post "/api/v1/admin/asjjf/snapshots", params: { page_type: "event_results" }, headers: @headers
    assert_response :unprocessable_entity
  end

  test "upload enforces size and extension" do
    tempfile = Tempfile.new([ "large", ".html" ])
    tempfile.write("x" * (2.megabytes + 1))
    tempfile.rewind
    upload = Rack::Test::UploadedFile.new(tempfile.path, "text/html")
    post "/api/v1/admin/asjjf/snapshots", params: { file: upload, page_type: "event_results", url: "https://asjjf.org/main/eventResults/2062" }, headers: @headers
    assert_response :content_too_large
    upload = Rack::Test::UploadedFile.new(tempfile.path, "text/html", original_filename: "page.txt")
    post "/api/v1/admin/asjjf/snapshots", params: { file: upload, page_type: "event_results", url: "https://asjjf.org/main/eventResults/2062" }, headers: @headers
    assert_response :unprocessable_entity
  ensure
    tempfile&.close!
  end

  test "only admin can resume, while viewer and anonymous cannot access staff APIs" do
    AsjjfSetting.breaker.update!(paused_until: 12.hours.from_now)
    post "/api/v1/admin/asjjf/close_breaker", headers: @headers
    assert_response :forbidden
    @user.update!(role: "admin")
    post "/api/v1/admin/asjjf/close_breaker", headers: @headers
    assert_response :success
    assert_not AsjjfSetting.breaker.open?
    @user.update!(role: "viewer")
    get "/api/v1/admin/asjjf/status", headers: @headers
    assert_response :forbidden
    post "/api/v1/admin/events/#{@event.id}/asjjf_check", headers: @headers
    assert_response :forbidden
    post "/api/v1/admin/asjjf/snapshots", headers: @headers
    assert_response :forbidden
    get "/api/v1/admin/asjjf/status"
    assert_response :unauthorized
  end
end
