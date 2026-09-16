require "test_helper"
require Rails.root.join("db/migrate/20260916125000_add_hotel_tano_sponsor")

class AddHotelTanoSponsorTest < ActiveSupport::TestCase
  setup do
    @organization = Organization.create!(name: "Marianas Open", slug: "marianas-open")
    @migration = AddHotelTanoSponsor.new
  end

  test "up targets the Marianas Open organization and down removes the inserted sponsor" do
    other_organization = Organization.create!(name: "Partner Series", slug: "partner-series")

    @migration.up

    assert_nil other_organization.sponsors.find_by(name: "Hotel Tano Guam")
    sponsor = @organization.sponsors.find_by!(name: "Hotel Tano Guam")
    assert_equal "official", sponsor.tier
    assert_equal 18, sponsor.sort_order

    @migration.down

    assert_nil @organization.sponsors.find_by(name: "Hotel Tano Guam")
  end

  test "up and down preserve a pre-existing sponsor" do
    sponsor = @organization.sponsors.create!(
      name: "Hotel Tano Guam",
      tier: "presenting",
      sort_order: 3,
      website_url: "https://example.com/hotel-tano"
    )

    @migration.up
    @migration.down

    assert_equal "presenting", sponsor.reload.tier
    assert_equal 3, sponsor.sort_order
    assert_equal "https://example.com/hotel-tano", sponsor.website_url
  end

  test "down preserves a sponsor edited after migration" do
    @migration.up
    sponsor = @organization.sponsors.find_by!(name: "Hotel Tano Guam")
    sponsor.update!(sort_order: 7)

    @migration.down

    assert_equal 7, sponsor.reload.sort_order
  end
end
