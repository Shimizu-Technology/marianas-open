class AddReadyH2goBoss104AndStickyFingersSponsors < ActiveRecord::Migration[8.1]
  SPONSOR_NAMES = ["Ready H2GO", "Boss 104", "Sticky Fingers"].freeze

  def up
    org = Organization.first
    return unless org

    upsert_sponsor(org, name: "Ready H2GO", tier: "presenting", sort_order: 2)
    upsert_sponsor(org, name: "Boss 104", tier: "official", sort_order: 16)
    upsert_sponsor(org, name: "Sticky Fingers", tier: "official", sort_order: 17)
  end

  def down
    org = Organization.first
    return unless org

    org.sponsors.where(name: SPONSOR_NAMES).destroy_all
  end

  private

  def upsert_sponsor(org, name:, tier:, sort_order:, website_url: nil)
    sponsor = org.sponsors.find_or_initialize_by(name: name)
    attrs = { tier: tier, sort_order: sort_order }
    attrs[:website_url] = website_url unless website_url.nil?

    sponsor.assign_attributes(attrs)
    sponsor.save!
  end
end
