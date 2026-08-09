require "test_helper"

class Api::V1::EventsControllerTest < ActionDispatch::IntegrationTest
  setup do
    organization = Organization.create!(name: "Marianas Open", slug: "marianas-open")
    season = Season.create!(year: 2027, name: "2027 Marianas Open Circuit", status: "active", current: true)
    @event = organization.events.create!(
      name: "Public Event",
      slug: "public-event",
      season: season,
      status: "upcoming",
      date: Date.new(2027, 10, 16),
      venue_name: "Field House",
      city: "Mangilao",
      country: "Guam"
    )
  end

  test "public index omits admin-only readiness metadata" do
    get api_v1_events_path

    assert_response :ok
    payload = response.parsed_body.first
    assert_not payload.key?("readiness")
    assert_not payload.key?("season")
    assert_equal @event.season_id, payload["season_id"]
  end

  test "public show omits admin-only readiness metadata" do
    get "/api/v1/events/#{@event.slug}"

    assert_response :ok
    payload = response.parsed_body
    assert_not payload.key?("readiness")
    assert_not payload.key?("season")
  end
end
