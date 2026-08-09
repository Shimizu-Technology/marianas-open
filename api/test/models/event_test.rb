require "test_helper"

class EventTest < ActiveSupport::TestCase
  setup do
    @organization = Organization.create!(name: "Marianas Open", slug: "marianas-open")
    @season = Season.create!(year: 2027, name: "2027 Marianas Open Circuit")
  end

  test "draft readiness explains blocking and recommended work" do
    event = @organization.events.create!(name: "Marianas Open 2027", slug: "marianas-open-2027", season: @season)

    assert_not event.publishable?
    assert_includes event.readiness[:checks].select { |check| check[:blocking] && !check[:complete] }.pluck(:key), "date"
    assert_includes event.readiness[:checks].select { |check| check[:blocking] && !check[:complete] }.pluck(:key), "registration"
  end

  test "complete event data is publishable without optional marketing content" do
    event = @organization.events.create!(
      name: "Marianas Open 2027",
      slug: "marianas-open-2027",
      season: @season,
      date: Date.new(2027, 10, 16),
      venue_name: "University of Guam Calvo Field House",
      city: "Mangilao",
      country: "Guam",
      registration_url: "https://asjjf.org/main/eventInfo/2000"
    )

    assert event.publishable?
    assert_not event.readiness[:checks].find { |check| check[:key] == "hero_image" }[:blocking]
  end

  test "only one main event is allowed per season" do
    @organization.events.create!(name: "First", slug: "first", season: @season, is_main_event: true)
    second = @organization.events.build(name: "Second", slug: "second", season: @season, is_main_event: true)

    assert_not second.valid?
    assert_includes second.errors[:is_main_event], "is already assigned to another event in this season"
  end

  test "current season fallback never selects a future draft" do
    @season.update!(status: "active", current: false)
    Season.create!(year: 2028, name: "Future Draft", status: "draft")

    assert_equal @season, Season.current_season
  end

  test "readiness checks season presence without loading the association" do
    event = @organization.events.create!(
      name: "Efficient Event",
      slug: "efficient-event",
      season: @season
    )
    event = Event.find(event.id)

    assert_not event.association(:season).loaded?
    assert event.readiness[:checks].find { |check| check[:key] == "season" }[:complete]
    assert_not event.association(:season).loaded?
  end

  test "season serialization preloads rollover source events" do
    source_season = Season.create!(year: 2026, name: "2026 Marianas Open Circuit")
    source = @organization.events.create!(
      name: "Marianas Open 2026",
      slug: "marianas-open-2026",
      season: source_season,
      date: Date.new(2026, 10, 17)
    )
    @organization.events.create!(
      name: "Marianas Open 2027",
      slug: "marianas-open-2027",
      season: @season,
      source_event: source
    )
    season = Season.find(@season.id)

    season.as_json

    assert season.events.all? { |event| event.association(:source_event).loaded? }
    assert season.events.all? { |event| event.association(:season).loaded? }
  end

  test "stale year readiness only inspects text inside nested rollover content" do
    source_season = Season.create!(year: 2026, name: "2026 Marianas Open Circuit")
    source = @organization.events.create!(
      name: "Marianas Open 2026",
      slug: "marianas-open-2026",
      season: source_season,
      date: Date.new(2026, 10, 17)
    )
    rolled_event = @organization.events.create!(
      name: "Marianas Open 2027",
      slug: "marianas-open-2027",
      season: @season,
      source_event: source,
      registration_info_items: [ { label: "Page ID", value: 2026 } ]
    )

    assert rolled_event.readiness[:checks].find { |check| check[:key] == "stale_year" }[:complete]

    rolled_event.update!(registration_info_items: [ { label: "Registration", value: "Deadline: October 2026" } ])

    assert_not rolled_event.readiness[:checks].find { |check| check[:key] == "stale_year" }[:complete]
  end
end
