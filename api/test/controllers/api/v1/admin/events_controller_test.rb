require "test_helper"

class Api::V1::Admin::EventsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @admin = User.create!(
      clerk_id: "event-admin-clerk",
      email: "event-admin@example.com",
      role: "admin"
    )
    organization = Organization.create!(name: "Marianas Open", slug: "marianas-open")
    @event = organization.events.create!(name: "Marianas Open", slug: "marianas-open")
  end

  test "clone rejects a missing target season instead of silently creating an unassigned event" do
    assert_no_difference("Event.count") do
      with_verified_user do
        post clone_api_v1_admin_event_path(@event),
          params: { season_id: 999_999 },
          headers: authorization_header
      end
    end

    assert_response :unprocessable_entity
    assert_equal [ "Target season not found." ], response.parsed_body["errors"]
  end

  test "publish rejects an incomplete draft" do
    with_verified_user do
      post publish_api_v1_admin_event_path(@event), headers: authorization_header
    end

    assert_response :unprocessable_entity
    assert_equal "draft", @event.reload.status
    assert_includes response.parsed_body["errors"], "Complete all required readiness checks before publishing."
  end

  test "publish and unpublish use explicit safe transitions" do
    make_publishable!

    assert_difference("AuditLog.count", 1) do
      with_verified_user do
        post publish_api_v1_admin_event_path(@event),
          params: { publish_status: "live" },
          headers: authorization_header
      end
    end

    assert_response :ok
    assert_equal "live", @event.reload.status

    @event.update_column(:live_stream_active, true)
    assert_difference("AuditLog.count", 1) do
      with_verified_user do
        post unpublish_api_v1_admin_event_path(@event), headers: authorization_header
      end
    end

    assert_response :ok
    assert_equal "draft", @event.reload.status
    assert_not @event.live_stream_active
  end

  test "generic update cannot bypass publishing readiness" do
    with_verified_user do
      patch api_v1_admin_event_path(@event),
        params: { status: "upcoming" },
        headers: authorization_header
    end

    assert_response :unprocessable_entity
    assert_equal "draft", @event.reload.status
  end

  private

  def authorization_header
    { "Authorization" => "Bearer test-token" }
  end

  def make_publishable!
    season = Season.create!(year: 2027, name: "2027 Marianas Open Circuit")
    @event.update!(
      season: season,
      date: Date.new(2027, 10, 16),
      venue_name: "University of Guam Calvo Field House",
      city: "Mangilao",
      country: "Guam",
      registration_url: "https://asjjf.org/main/eventInfo/2000"
    )
  end

  def with_verified_user
    original_verify = ClerkAuth.method(:verify)
    admin = @admin
    ClerkAuth.define_singleton_method(:verify) do |_token|
      { "sub" => admin.clerk_id, "email" => admin.email }
    end
    yield
  ensure
    ClerkAuth.define_singleton_method(:verify, original_verify)
  end
end
