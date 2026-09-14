require "test_helper"

class EventTravelItemsTest < ActiveSupport::TestCase
  setup do
    @organization = Organization.create!(name: "Marianas Open", slug: "marianas-open")
  end

  test "accepts and normalizes a travel offer" do
    event = build_event(
      travel_items: [
        {
          key: "united-meetings-travel-2026",
          kind: "offer",
          title: " United Meetings Travel ",
          description: " Search for eligible flights. ",
          code: " zsfx863836 ",
          url: " https://www.united.com/en/us/meetingtravel ",
          link_label: " Search United flights "
        }
      ]
    )

    assert event.save
    offer = event.reload.travel_items.first
    assert_equal "United Meetings Travel", offer["title"]
    assert_equal "zsfx863836", offer["code"]
    assert_equal "https://www.united.com/en/us/meetingtravel", offer["url"]
  end

  test "rejects unsafe travel URLs" do
    event = build_event(
      travel_items: [
        {
          kind: "offer",
          title: "Unsafe offer",
          code: "CODE123",
          url: "javascript:alert(1)",
          link_label: "Open offer"
        }
      ]
    )

    assert_not event.valid?
    assert_includes event.errors[:travel_items], "card 1 URL must use http or https"
  end

  test "requires offer codes and keeps codes off information cards" do
    missing_code = build_event(
      travel_items: [{ kind: "offer", title: "Missing code", description: "Details" }]
    )
    information_with_code = build_event(
      travel_items: [{ kind: "info", title: "Airport", description: "Details", code: "SHOULD-NOT-BE-HERE" }]
    )

    assert_not missing_code.valid?
    assert_includes missing_code.errors[:travel_items], "card 1 needs an offer code"
    assert_not information_with_code.valid?
    assert_includes information_with_code.errors[:travel_items], "card 1 code is only supported for offer cards"
  end

  test "requires a list of object cards" do
    non_list = build_event(travel_items: "not-a-list")
    non_object = build_event(travel_items: [ "not-an-object" ])

    assert_not non_list.valid?
    assert_includes non_list.errors[:travel_items], "must be a list"
    assert_not non_object.valid?
    assert_includes non_object.errors[:travel_items], "card 1 must be an object"
  end

  test "allows up to twelve cards" do
    twelve_cards = Array.new(12) do |index|
      { kind: "info", title: "Travel card #{index + 1}", value: "GUM" }
    end
    allowed = build_event(travel_items: twelve_cards)
    too_many = build_event(travel_items: twelve_cards + [ { kind: "info", title: "Extra card", value: "GUM" } ])

    assert allowed.valid?
    assert_not too_many.valid?
    assert_includes too_many.errors[:travel_items], "cannot contain more than 12 cards"
  end

  test "rejects unsupported kinds and missing titles" do
    event = build_event(
      travel_items: [
        { kind: "discount", title: "Unsupported", value: "GUM" },
        { kind: "info", description: "Missing title" }
      ]
    )

    assert_not event.valid?
    assert_includes event.errors[:travel_items], "card 1 has an unsupported type"
    assert_includes event.errors[:travel_items], "card 2 needs a title"
  end

  test "enforces travel card field limits" do
    event = build_event(
      travel_items: [
        {
          key: "a" * 81,
          kind: "offer",
          title: "a" * 101,
          description: "a" * 501,
          value: "a" * 101,
          code: "a" * 81,
          url: "https://example.com/#{"a" * 2_100}",
          link_label: "a" * 101
        }
      ]
    )

    assert_not event.valid?
    %w[key title description value code url link_label].each do |field|
      assert_includes event.errors[:travel_items], "card 1 #{field.humanize.downcase} is too long"
    end
  end

  test "validates keys and requires labels for linked cards" do
    event = build_event(
      travel_items: [
        {
          key: "Invalid Key",
          kind: "info",
          title: "Airline information",
          description: "Booking details",
          url: "https://example.com/travel"
        }
      ]
    )

    assert_not event.valid?
    assert_includes event.errors[:travel_items], "card 1 key is invalid"
    assert_includes event.errors[:travel_items], "card 1 needs a link label when a URL is set"
  end

  private

  def build_event(attributes = {})
    @organization.events.build({
      name: "Guam Marianas Open 2026",
      slug: "marianas-open-2026",
      date: Date.new(2026, 10, 24),
      status: "upcoming"
    }.merge(attributes))
  end
end
