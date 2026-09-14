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
