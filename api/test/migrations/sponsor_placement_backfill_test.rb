require "test_helper"
require Rails.root.join("db/migrate/20261102200000_create_sponsor_placements")

class SponsorPlacementBackfillTest < ActiveSupport::TestCase
  test "backfill preserves current homepage membership order URLs and event lineup and is idempotent" do
    org = Organization.create!(name: "Marianas Open", slug: "mo")
    event = org.events.create!(name: "Marianas Open 2026", slug: "marianas-open-2026", date: Date.current)
    [ [ "GVB (Guam Visitors Bureau)", "presenting" ], [ "Ready H2GO", "presenting" ], [ "Triple J", "official" ], [ "Hotel Tano Guam", "official" ], [ "ASJJF", "partner" ] ].each_with_index do |(name, tier), i|
      org.sponsors.create!(name: name, tier: tier, sort_order: i, website_url: name == "Hotel Tano Guam" ? nil : "https://example.com/#{i}")
    end
    before = org.sponsors.order(:sort_order).map { |s| [ s.id, s.name, s.tier, s.sort_order, s.website_url ] }
    migration = CreateSponsorPlacements.new
    2.times { migration.backfill_placements }
    assert_equal before, org.sponsors.order(:sort_order).map { |s| [ s.id, s.name, s.tier, s.sort_order, s.website_url ] }
    expected = { "presenting" => [ "GVB (Guam Visitors Bureau)" ], "secondary" => [ "Ready H2GO" ], "official" => [ "Triple J", "Hotel Tano Guam" ] }
    expected.each do |type, names|
      assert_equal names, SponsorPlacement.where(placement_type: type).ordered.map { |p| p.sponsor.name }
    end
    assert_equal 4, SponsorPlacement.where.not(placement_type: "event").count
    assert_equal before.map(&:first), SponsorPlacement.where(placement_type: "event", event_id: [ nil, event.id ]).ordered.pluck(:sponsor_id)
    hotel = org.sponsors.find_by!(name: "Hotel Tano Guam")
    assert_equal event.id, hotel.sponsor_placements.find_by!(placement_type: "event").event_id
    assert_equal "https://www.hoteltano.com", hotel.sponsor_placements.find_by!(placement_type: "official").cta_url
  end
end
