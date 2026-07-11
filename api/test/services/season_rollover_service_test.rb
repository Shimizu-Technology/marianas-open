require "test_helper"

class SeasonRolloverServiceTest < ActiveSupport::TestCase
  setup do
    @organization = Organization.create!(name: "Marianas Open", slug: "marianas-open")
    @source_season = Season.create!(year: 2026, name: "2026 Marianas Open Circuit")
    @source_event = @organization.events.create!(name: "Marianas Pro 2026", slug: "marianas-pro-2026", season: @source_season)
    sponsor = @organization.sponsors.create!(name: "Island Sponsor")
    SponsorPlacement.create!(sponsor: sponsor, season: @source_season, event: @source_event, placement_type: "event_hero")
  end

  test "rolls events and event-scoped sponsor inventory into inactive drafts" do
    result = SeasonRolloverService.call(source_season: @source_season, target_year: 2027)
    placement = result[:season].sponsor_placements.first

    assert_equal 2027, result[:season].year
    assert_equal [ "draft" ], result[:events].map(&:status).uniq
    assert_equal result[:events].first, placement.event
    assert_not placement.active
    assert_nil placement.starts_at
  end

  test "refuses to merge rollover into an existing season" do
    Season.create!(year: 2027, name: "Existing 2027")

    error = assert_raises(ArgumentError) do
      SeasonRolloverService.call(source_season: @source_season, target_year: 2027)
    end
    assert_equal "The 2027 season already exists", error.message
  end
end
