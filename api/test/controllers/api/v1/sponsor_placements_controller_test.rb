require "test_helper"

class Api::V1::SponsorPlacementsControllerTest < ActionDispatch::IntegrationTest
  setup do
    organization = Organization.create!(name: "Marianas Open", slug: "marianas-open")
    @sponsor = organization.sponsors.create!(name: "Island Sponsor")
    @current_season = Season.create!(
      year: 2027,
      name: "2027 Marianas Open Circuit",
      status: "active",
      current: true
    )
    @event = organization.events.create!(
      name: "Marianas Open 2027",
      slug: "marianas-open-2027",
      season: @current_season
    )
  end

  test "featured bar only returns active global or current-season placements in schedule" do
    global = SponsorPlacement.create!(sponsor: @sponsor, headline: "Global")
    current = SponsorPlacement.create!(sponsor: @sponsor, season: @current_season, headline: "Current")
    SponsorPlacement.create!(sponsor: @sponsor, season: @current_season, headline: "Future", starts_at: 1.day.from_now)
    SponsorPlacement.create!(sponsor: @sponsor, season: @current_season, headline: "Inactive", active: false)
    SponsorPlacement.create!(sponsor: @sponsor, season: @current_season, event: @event, headline: "Event")
    old_season = Season.create!(year: 2026, name: "2026 Marianas Open Circuit", status: "archived")
    SponsorPlacement.create!(sponsor: @sponsor, season: old_season, headline: "Archived")

    get api_v1_sponsor_placements_path, params: { placement_type: "featured_bar" }

    assert_response :ok
    ids = response.parsed_body["sponsor_placements"].pluck("id")
    assert_equal [ global.id, current.id ].sort, ids.sort
  end

  test "event scope returns only placements for the requested event" do
    placement = SponsorPlacement.create!(sponsor: @sponsor, season: @current_season, event: @event, placement_type: "event_hero")
    SponsorPlacement.create!(sponsor: @sponsor, season: @current_season, placement_type: "event_hero")

    get api_v1_sponsor_placements_path,
      params: { placement_type: "event_hero", event_id: @event.id, season_id: @current_season.id }

    assert_response :ok
    assert_equal [ placement.id ], response.parsed_body["sponsor_placements"].pluck("id")
  end
end
