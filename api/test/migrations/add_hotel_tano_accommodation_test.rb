require "test_helper"
require Rails.root.join("db/migrate/20260917070000_add_hotel_tano_accommodation")

class AddHotelTanoAccommodationTest < ActiveSupport::TestCase
  setup do
    @organization = Organization.create!(name: "Marianas Open", slug: "marianas-open")
    @event = @organization.events.create!(
      name: "Guam Marianas Open 2026",
      slug: "marianas-open-2026",
      date: Date.new(2026, 10, 24),
      status: "upcoming"
    )
    @sponsor = @organization.sponsors.create!(
      name: "Hotel Tano Guam",
      tier: "official",
      sort_order: 18
    )
    @migration = AddHotelTanoAccommodation.new
  end

  test "up adds the hotel offer only to the Guam championship event" do
    other_event = @organization.events.create!(
      name: "Guam Marianas Pro Manila 2026",
      slug: "marianas-pro-manila-2026",
      date: Date.new(2026, 4, 26),
      status: "completed"
    )

    @migration.up

    accommodation = @event.event_accommodations.find_by!(hotel_name: "Hotel Tano Guam")
    assert_equal "tanosports", accommodation.booking_code
    assert_equal "https://www.hoteltano.com", accommodation.booking_url
    assert_includes accommodation.description, "1000 Pale San Vitores Road"
    assert_includes accommodation.inclusions, "Free parking"
    assert_empty other_event.event_accommodations
  end

  test "up fills a blank sponsor website without replacing an existing accommodation" do
    accommodation = @event.event_accommodations.create!(
      hotel_name: "Hotel Tano Guam",
      description: "Administrator-managed offer",
      booking_code: "CUSTOM",
      active: true
    )

    @migration.up

    assert_equal "https://www.hoteltano.com", @sponsor.reload.website_url
    assert_equal "Administrator-managed offer", accommodation.reload.description
    assert_equal "CUSTOM", accommodation.booking_code
    assert_equal 1, @event.event_accommodations.count
  end

  test "up preserves a sponsor website that is already configured" do
    @sponsor.update!(website_url: "https://book.example.com/hotel-tano")

    @migration.up

    assert_equal "https://book.example.com/hotel-tano", @sponsor.reload.website_url
  end

  test "down is irreversible so administrator-managed records are never deleted" do
    @migration.up

    assert_raises(ActiveRecord::IrreversibleMigration) { @migration.down }
    assert @event.event_accommodations.exists?(hotel_name: "Hotel Tano Guam")
  end
end
