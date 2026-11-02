require "test_helper"

class EventPublishingTest < ActionDispatch::IntegrationTest
  setup do
    @user = User.create!(clerk_id: "d1-staff", email: "d1staff@example.com", role: "staff")
    @org = Organization.create!(name: "D1", slug: "d1")
    @event = @org.events.create!(name: "D1 2027", slug: "d1-2027", status: "draft", season_year: 2027)
    @headers = { "Authorization" => "Bearer d1" }
    @verify = ClerkAuth.method(:verify)
    ClerkAuth.define_singleton_method(:verify) { |_token| { "sub" => "d1-staff" } }
  end

  teardown { ClerkAuth.define_singleton_method(:verify, @verify) }

  test "publishing blocks missing facts including direct create and update" do
    post "/api/v1/admin/events/#{@event.id}/publish", headers: @headers, as: :json
    assert_response :unprocessable_entity
    assert_not response.parsed_body.dig("readiness", "publishable")
    patch "/api/v1/admin/events/#{@event.id}", params: { status: "live" }, headers: @headers, as: :json
    assert_response :unprocessable_entity
    post "/api/v1/admin/events", params: { name: "Unsafe", slug: "unsafe", status: "upcoming" }, headers: @headers, as: :json
    assert_response :unprocessable_entity
    assert_equal "draft", @event.reload.status
    get "/api/v1/events"
    assert_equal [], response.parsed_body
    get "/api/v1/events/#{@event.slug}"
    assert_response :not_found
  end

  test "staff can fix readiness publish and unpublish with status audit" do
    make_ready
    post "/api/v1/admin/events/#{@event.id}/publish", headers: @headers, as: :json
    assert_response :success
    assert_equal "upcoming", @event.reload.status
    audit = @event.event_audit_entries.last
    assert_equal "publish", audit.action
    assert_equal "draft", audit.from_status
    assert_equal "upcoming", audit.to_status
    assert_equal @user.id, audit.actor_id
    get "/api/v1/events/#{@event.slug}"
    assert_response :success
    assert_not response.parsed_body.key?("audit_entries")
    post "/api/v1/admin/events/#{@event.id}/unpublish", headers: @headers, as: :json
    assert_response :success
    assert_equal "draft", @event.reload.status
    assert_equal "unpublish", @event.event_audit_entries.last.action
    get "/api/v1/events/#{@event.slug}"
    assert_response :not_found
  end

  test "only admins can override and reason plus failed checks are audited" do
    post "/api/v1/admin/events/#{@event.id}/publish", params: { override_reason: "Confirmed with organizer" }, headers: @headers, as: :json
    assert_response :forbidden
    @user.update!(role: "admin")
    post "/api/v1/admin/events/#{@event.id}/publish", params: { override_reason: "short" }, headers: @headers, as: :json
    assert_response :unprocessable_entity
    post "/api/v1/admin/events/#{@event.id}/publish", params: { override_reason: "Confirmed with organizer" }, headers: @headers, as: :json
    assert_response :success
    audit = @event.event_audit_entries.last
    assert_equal "Confirmed with organizer", audit.reason
    assert audit.metadata["overridden"]
    assert_not audit.metadata.dig("readiness", "publishable")
  end

  test "unconfirmed rows stay private even after admin override" do
    @event.event_schedule_items.create!(time: "9 AM", description: "Placeholder", confirmed: false)
    @event.prize_categories.create!(name: "Fake prize", amount: 99999, confirmed: false)
    @event.event_schedule_items.create!(time: "10 AM", description: "Confirmed", confirmed: true)
    @user.update!(role: "admin")
    post "/api/v1/admin/events/#{@event.id}/publish", params: { override_reason: "Announce dates; prizes remain private" }, headers: @headers, as: :json
    assert_response :success
    assert_equal 2, response.parsed_body.dig("event", "event_schedule_items").size
    get "/api/v1/events/#{@event.slug}"
    assert_response :success
    assert_equal [ "Confirmed" ], response.parsed_body["event_schedule_items"].map { |item| item["description"] }
    assert_equal [], response.parsed_body["prize_categories"]
    get "/api/v1/events"
    assert_equal 1, response.parsed_body.first["event_schedule_items"].size
    assert_equal [], response.parsed_body.first["prize_categories"]
  end

  test "viewers and anonymous users cannot rollover or publish or fill facts" do
    @user.update!(role: "viewer")
    %w[clone publish unpublish fill_asjjf verify_asjjf].each do |action|
      post "/api/v1/admin/events/#{@event.id}/#{action}", params: { target_year: 2028, asjjf_event_id: 2258 }, headers: @headers, as: :json
      assert_response :forbidden
    end
    post "/api/v1/admin/events/rollover", params: { source_year: 2027, target_year: 2028 }, headers: @headers, as: :json
    assert_response :forbidden
    post "/api/v1/admin/events/#{@event.id}/publish", as: :json
    assert_response :unauthorized
  end

  test "staff can verify a published event against saved ASJJF evidence" do
    make_ready
    post "/api/v1/admin/events/#{@event.id}/publish", headers: @headers, as: :json
    assert_response :success
    post "/api/v1/admin/events/#{@event.id}/verify_asjjf", params: { asjjf_event_id: 2258 }, headers: @headers, as: :json
    assert_response :unprocessable_entity
    assert_includes response.parsed_body["errors"].first, "No saved ASJJF event information page"
  end

  test "slug duplicates are rejected and public URLs are stable until unpublished" do
    @org.events.create!(name: "Duplicate", slug: "another", status: "draft")
    patch "/api/v1/admin/events/#{@event.id}", params: { slug: "another" }, headers: @headers, as: :json
    assert_response :unprocessable_entity
    make_ready
    post "/api/v1/admin/events/#{@event.id}/publish", headers: @headers, as: :json
    assert_response :success
    patch "/api/v1/admin/events/#{@event.id}", params: { slug: "changed" }, headers: @headers, as: :json
    assert_response :unprocessable_entity
    assert_equal "d1-2027", @event.reload.slug
  end

  test "staff can copy one event or the whole season and pending facts are explained" do
    @event.update!(season_year: 2026)
    post "/api/v1/admin/events/#{@event.id}/clone", params: { target_year: 2027, asjjf_event_id: 2258 }, headers: @headers, as: :json
    assert_response :created
    assert_equal "draft", response.parsed_body.dig("event", "status")
    assert_equal "pending", response.parsed_body.dig("event", "asjjf_info_status")
    assert_includes response.parsed_body["message"], "not available yet"
    clone_id = response.parsed_body.dig("event", "id")
    post "/api/v1/admin/events/#{clone_id}/fill_asjjf", params: { asjjf_event_id: 2258 }, headers: @headers, as: :json
    assert_response :success
    assert_equal "pending", response.parsed_body.dig("event", "asjjf_info_status")
    post "/api/v1/admin/events/rollover", params: { source_year: 2026, target_year: 2027 }, headers: @headers, as: :json
    assert_response :created
    assert_equal 1, response.parsed_body["events"].size
    assert_equal "draft", response.parsed_body["events"].first["status"]
  end

  private

  def make_ready
    @event.update!(date: "2027-01-30", venue_name: "Fieldhouse", registration_not_open: true)
  end
end
