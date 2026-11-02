require "test_helper"

class AdminViewerTest < ActionDispatch::IntegrationTest
  setup do
    @viewer = User.create!(email: "d5-viewer@example.com", clerk_id: "d5-viewer", role: "viewer")
    @headers = { "Authorization" => "Bearer test_token_#{@viewer.id}" }
    @org = Organization.create!(name: "D5", slug: "d5")
    @event = @org.events.create!(name: "Past", slug: "past", date: 3.days.ago.to_date, status: "upcoming")
  end

  # Enumerate the router so future admin write routes automatically join this
  # coverage. Missing IDs prove authorization happens before resource lookup.
  writes = Rails.application.routes.routes.select do |route|
    route.defaults[:controller].to_s.start_with?("api/v1/admin/") && route.verb.match?(/POST|PUT|PATCH|DELETE/)
  end
  writes.group_by { |route| route.defaults[:controller] }.each do |controller, routes|
    test "viewer cannot write through #{controller}" do
      routes.each do |route|
        path = route.path.spec.to_s.sub("(.:format)", "").gsub(/:[a-z_]+/, "999999999")
        verb = route.verb[/POST|PUT|PATCH|DELETE/].downcase
        public_send(verb, path, headers: @headers, params: {}, as: :json)
        assert_response :forbidden, "#{verb.upcase} #{path}"
        assert_equal "Viewer access is read-only", response.parsed_body["error"], path
      end
    end
  end

  test "legacy GET preview is also a write and cannot create a run" do
    assert_no_difference "ResultsSyncRun.count" do
      get "/api/v1/admin/events/#{@event.id}/import_results_preview", headers: @headers
      assert_response :forbidden
      head "/api/v1/admin/events/#{@event.id}/import_results_preview", headers: @headers
      assert_response :forbidden
    end
  end

  test "viewer reads shared pages without completing events or creating defaults" do
    assert_no_difference [ "EventAuditEntry.count", "AsjjfSetting.count", "ImpactConfiguration.count" ] do
      %W[/api/v1/admin/events /api/v1/admin/events/#{@event.id} /api/v1/admin/asjjf/status /api/v1/admin/impact-configuration /api/v1/admin/identity_reviews /api/v1/admin/videos /api/v1/admin/sponsors /api/v1/admin/events/#{@event.id}/results_sync].each do |path|
        get path, headers: @headers
        assert_response :success, path
      end
    end
    assert_equal "upcoming", @event.reload.status
    %w[users organization].each do |page|
      get "/api/v1/admin/#{page}", headers: @headers
      assert_response :forbidden
    end
  end

  test "viewer batch reads do not refresh saved counts or completion time" do
    batch = @event.event_gallery_upload_batches.create!(total_files: 1, uploaded_files: 1, status: "completed", completed_at: 1.day.ago)
    before = batch.attributes
    get "/api/v1/admin/events/#{@event.id}/gallery-upload-batches/#{batch.id}", headers: @headers
    assert_response :success
    head "/api/v1/admin/events/#{@event.id}/gallery-upload-batches/#{batch.id}", headers: @headers
    assert_response :success
    assert_equal before, batch.reload.attributes
  end

  test "admin can invite a viewer without changing anyone else's role" do
    @viewer.update!(role: "admin")
    secret = ENV.delete("CLERK_SECRET_KEY")
    post "/api/v1/admin/users", headers: @headers, params: { email: "d5-invited@example.com", role: "viewer" }, as: :json
    assert_response :created
    assert_equal "viewer", response.parsed_body.dig("user", "role")
    assert_equal "pending", response.parsed_body.dig("user", "invitation_status")
    assert @viewer.reload.admin?
  ensure
    ENV["CLERK_SECRET_KEY"] = secret
  end
end
