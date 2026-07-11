require "test_helper"

class SponsorPlacementTest < ActiveSupport::TestCase
  test "display asset scope preloads placement media and sponsor logos" do
    organization = Organization.create!(name: "Marianas Open", slug: "marianas-open")
    sponsor = organization.sponsors.create!(name: "Island Sponsor")
    placement = SponsorPlacement.create!(sponsor: sponsor)

    loaded = SponsorPlacement.with_display_assets.find(placement.id)

    assert loaded.association(:media_attachment).loaded?
    assert loaded.sponsor.association(:logo_attachment).loaded?
  end
end
