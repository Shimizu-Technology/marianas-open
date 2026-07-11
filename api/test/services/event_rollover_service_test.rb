require "test_helper"

class EventRolloverServiceTest < ActiveSupport::TestCase
  setup do
    organization = Organization.create!(name: "Marianas Open", slug: "marianas-open")
    source_season = Season.create!(year: 2026, name: "2026 Marianas Open Circuit")
    @target_season = Season.create!(year: 2027, name: "2027 Marianas Open Circuit")
    @source = organization.events.create!(
      name: "Marianas Open 2026",
      slug: "marianas-open-2026",
      season: source_season,
      status: "upcoming",
      date: Date.new(2026, 10, 17),
      is_main_event: true,
      venue_name: "Field House",
      city: "Mangilao",
      country: "Guam",
      registration_url: "https://asjjf.org/main/eventInfo/1900",
      live_stream_url: "https://youtube.test/live",
      live_stream_active: true,
      asjjf_event_ids: [ 1900 ]
    )
    @source.event_schedule_items.create!(time: "9:00 AM", description: "Competition")
    @source.event_accommodations.create!(hotel_name: "Partner Hotel", check_in_date: Date.new(2026, 10, 15), booking_code: "OLD2026")
  end

  test "rollover preserves reusable content and resets stale operational data" do
    copy = EventRolloverService.call(source_event: @source, target_season: @target_season)

    assert_equal "Marianas Open 2027", copy.name
    assert_equal "draft", copy.status
    assert_equal @source, copy.source_event
    assert_nil copy.date
    assert_nil copy.registration_url
    assert_nil copy.live_stream_url
    assert_not copy.live_stream_active
    assert_empty copy.asjjf_event_ids
    assert_equal [ "Competition" ], copy.event_schedule_items.pluck(:description)
    assert_nil copy.event_accommodations.first.check_in_date
    assert_nil copy.event_accommodations.first.booking_code
  end
end
