require "test_helper"
require Rails.root.join("db/migrate/20260916125000_add_hotel_tano_sponsor")

class AddHotelTanoSponsorTest < ActiveSupport::TestCase
  setup do
    @organization = Organization.create!(name: "Marianas Open", slug: "marianas-open")
    @migration = AddHotelTanoSponsor.new
  end

  test "up targets the Marianas Open organization" do
    other_organization = Organization.create!(name: "Partner Series", slug: "partner-series")

    @migration.up

    assert_nil other_organization.sponsors.find_by(name: "Hotel Tano Guam")
    sponsor = @organization.sponsors.find_by!(name: "Hotel Tano Guam")
    assert_equal "official", sponsor.tier
    assert_equal 18, sponsor.sort_order
  end

  test "up preserves a pre-existing sponsor" do
    sponsor = @organization.sponsors.create!(
      name: "Hotel Tano Guam",
      tier: "presenting",
      sort_order: 3,
      website_url: "https://example.com/hotel-tano"
    )

    @migration.up

    assert_equal "presenting", sponsor.reload.tier
    assert_equal 3, sponsor.sort_order
    assert_equal "https://example.com/hotel-tano", sponsor.website_url
  end

  test "down is irreversible and preserves a pre-existing exact match" do
    sponsor = @organization.sponsors.create!(
      AddHotelTanoSponsor::SPONSOR_ATTRIBUTES
    )

    @migration.up

    assert_raises(ActiveRecord::IrreversibleMigration) { @migration.down }

    assert_equal AddHotelTanoSponsor::SPONSOR_ATTRIBUTES,
                 sponsor.reload.attributes.symbolize_keys.slice(
                   :name,
                   :tier,
                   :sort_order,
                   :website_url
                 )
  end
end
