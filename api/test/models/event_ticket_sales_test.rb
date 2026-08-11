require "test_helper"

class EventTicketSalesTest < ActiveSupport::TestCase
  setup do
    @organization = Organization.create!(name: "Marianas Open", slug: "marianas-open")
  end

  test "accepts and serializes valid spectator ticket data" do
    event = build_event(
      ticket_sales_status: "on_sale",
      ticket_sales_url: "  https://events.guamtime.net/event/example  ",
      ticket_options: [
        {
          label: "1-Day Child",
          description: "4–12 yrs",
          early_bird_price: "17.00",
          regular_price: "20.00"
        }
      ]
    )

    assert event.save
    assert_equal "https://events.guamtime.net/event/example", event.ticket_sales_url
    assert_equal "1-Day Child", event.as_json["ticket_options"].first["label"]
    assert_includes event.as_json.keys, "ticket_banner_image_url"
  end

  test "rejects unsafe checkout URLs" do
    event = build_event(ticket_sales_url: "javascript:alert(1)")

    assert_not event.valid?
    assert_includes event.errors[:ticket_sales_url], "must use http or https"
  end

  test "rejects malformed ticket options and prices" do
    event = build_event(
      ticket_options: [
        { label: "", early_bird_price: "free", regular_price: "-1" },
        { label: "VIP", early_bird_price: "NaN", regular_price: "100001" }
      ]
    )

    assert_not event.valid?
    assert event.errors[:ticket_options].any? { |message| message.include?("needs a label") }
    assert event.errors[:ticket_options].any? { |message| message.include?("must be a number") }
    assert event.errors[:ticket_options].any? { |message| message.include?("cannot be negative") }
    assert event.errors[:ticket_options].any? { |message| message.include?("must be finite") }
    assert event.errors[:ticket_options].any? { |message| message.include?("is too large") }
  end

  test "rejects non-image ticket flyer attachments" do
    event = build_event
    event.ticket_banner_image.attach(
      io: StringIO.new("not an image"),
      filename: "tickets.txt",
      content_type: "text/plain"
    )

    assert_not event.valid?
    assert_includes event.errors[:ticket_banner_image], "must be a JPEG, PNG, or WebP image"
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
