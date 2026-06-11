class AddReadyH2goBoss104AndStickyFingersSponsors < ActiveRecord::Migration[8.1]
  def up
    org = Organization.first
    return unless org

    upsert_sponsor(org, name: "Ready H2GO", tier: "presenting", sort_order: 2)
    upsert_sponsor(org, name: "Boss 104", tier: "official", sort_order: 16)
    upsert_sponsor(org, name: "Sticky Fingers", tier: "official", sort_order: 17)
  end

  def down
    Sponsor.where(name: ["Ready H2GO", "Boss 104", "Sticky Fingers"]).destroy_all
  end

  private

  def upsert_sponsor(org, name:, tier:, sort_order:, website_url: nil)
    sponsor = Sponsor.find_or_initialize_by(name: name, organization_id: org.id)
    sponsor.assign_attributes(tier: tier, sort_order: sort_order, website_url: website_url)
    sponsor.save!
  end
end
