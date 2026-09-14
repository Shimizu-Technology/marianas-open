require "test_helper"
require Rails.root.join("db/migrate/20260914160000_add_united_meetings_travel_to_marianas_open_2026")

class AddUnitedMeetingsTravelToMarianasOpen2026Test < ActiveSupport::TestCase
  setup do
    organization = Organization.create!(name: "Marianas Open", slug: "marianas-open")
    @event = organization.events.create!(
      name: "Guam Marianas Open 2026",
      slug: "marianas-open-2026",
      date: Date.new(2026, 10, 24),
      status: "upcoming"
    )
    @migration = AddUnitedMeetingsTravelToMarianasOpen2026.new
  end

  test "up preserves a preexisting card with the migration key" do
    custom_offer = {
      key: "united-meetings-travel-2026",
      kind: "offer",
      title: "Administrator version",
      description: "Keep this content.",
      code: "CUSTOM"
    }
    @event.update!(travel_items: [ custom_offer ])

    @migration.up

    assert_equal [ "Administrator version" ], @event.reload.travel_items.map { |item| item["title"] }
  end

  test "up adds the offer to existing locale arrays and down removes only that offer" do
    @event.update!(
      travel_items: [{ kind: "info", title: "Airport", value: "GUM" }],
      translations: {
        "travel_items" => {
          "ja" => [{ "kind" => "info", "title" => "空港", "value" => "GUM" }]
        }
      }
    )

    @migration.up
    translated_items = @event.reload.translations.dig("travel_items", "ja")
    assert_equal [ "空港", "United Meetings Travel" ], translated_items.map { |item| item["title"] }

    @migration.down
    assert_equal [ "Airport" ], @event.reload.travel_items.map { |item| item["title"] }
    assert_equal [ "空港" ], @event.translations.dig("travel_items", "ja").map { |item| item["title"] }
  end

  test "down preserves an unrelated translated card that shares the migration key" do
    unrelated_card = {
      "key" => "united-meetings-travel-2026",
      "kind" => "offer",
      "title" => "Existing locale offer",
      "code" => "CUSTOM"
    }
    @event.update!(translations: { "travel_items" => { "ja" => [ unrelated_card ] } })

    @migration.up
    @migration.down

    assert_equal [ unrelated_card ], @event.reload.translations.dig("travel_items", "ja")
  end

  test "down preserves an offer edited after migration" do
    @migration.up
    edited_items = @event.reload.travel_items.map do |item|
      item["key"] == "united-meetings-travel-2026" ? item.merge("description" => "Administrator edit") : item
    end
    @event.update!(travel_items: edited_items)

    @migration.down

    assert_equal "Administrator edit", @event.reload.travel_items.first["description"]
  end
end
