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

  test "cta URL only accepts HTTP and HTTPS links" do
    organization = Organization.create!(name: "Marianas Open", slug: "marianas-open")
    sponsor = organization.sponsors.create!(name: "Island Sponsor")

    %w[https://example.com/register http://example.com].each do |url|
      assert SponsorPlacement.new(sponsor: sponsor, cta_url: url).valid?, "expected #{url} to be valid"
    end

    [ "javascript:alert(1)", "data:text/html,unsafe", "/relative", "not a valid URL" ].each do |url|
      placement = SponsorPlacement.new(sponsor: sponsor, cta_url: url)

      assert_not placement.valid?, "expected #{url} to be invalid"
      assert_includes placement.errors[:cta_url], "must be a valid HTTP or HTTPS URL"
    end
  end
end
