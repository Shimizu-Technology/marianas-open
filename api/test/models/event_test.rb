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
end
