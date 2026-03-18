class ExpandSponsors2026 < ActiveRecord::Migration[8.1]
  def up
    org = Organization.first
    return unless org

    Sponsor.where(name: ["IP&E & Shell", "Holiday Resort & Spa"]).destroy_all

    new_sponsors = [
      { name: "Triple J",        tier: "official", sort_order: 2,  website_url: nil },
      { name: "Pacific Points",  tier: "official", sort_order: 3,  website_url: nil },
      { name: "Foody's",         tier: "official", sort_order: 4,  website_url: nil },
      { name: "Deal Depot",      tier: "official", sort_order: 5,  website_url: nil },
      { name: "CFPT",            tier: "official", sort_order: 6,  website_url: nil },
      { name: "Fokai",           tier: "official", sort_order: 7,  website_url: nil },
      { name: "Jamz Media",      tier: "official", sort_order: 8,  website_url: nil },
      { name: "Cherry Media",    tier: "official", sort_order: 9,  website_url: nil },
      { name: "Mannge Pops",     tier: "official", sort_order: 10, website_url: nil },
      { name: "Aloha Maid",      tier: "official", sort_order: 11, website_url: nil },
      { name: "Fence Masters",   tier: "official", sort_order: 12, website_url: nil },
    ]

    existing = %w[ITE Stroll\ Guam Hertz\ &\ Dollar]
    Sponsor.where(name: "ITE", organization_id: org.id).update_all(sort_order: 13)
    Sponsor.where(name: "Hertz & Dollar", organization_id: org.id).update_all(sort_order: 14)
    Sponsor.where(name: "Stroll Guam", organization_id: org.id).update_all(sort_order: 15)

    new_sponsors.each do |data|
      next if Sponsor.exists?(name: data[:name], organization_id: org.id)
      org.sponsors.create!(data)
    end
  end

  def down
    Sponsor.where(name: [
      "Triple J", "Pacific Points", "Foody's", "Deal Depot", "CFPT",
      "Fokai", "Jamz Media", "Cherry Media", "Mannge Pops",
      "Aloha Maid", "Fence Masters"
    ]).destroy_all

    org = Organization.first
    return unless org

    Sponsor.where(name: "ITE", organization_id: org.id).update_all(sort_order: 2)
    Sponsor.where(name: "Hertz & Dollar", organization_id: org.id).update_all(sort_order: 3)
    Sponsor.where(name: "Stroll Guam", organization_id: org.id).update_all(sort_order: 4)

    unless Sponsor.exists?(name: "IP&E & Shell", organization_id: org.id)
      org.sponsors.create!(name: "IP&E & Shell", tier: "official", sort_order: 5)
    end
    unless Sponsor.exists?(name: "Holiday Resort & Spa", organization_id: org.id)
      org.sponsors.create!(name: "Holiday Resort & Spa", tier: "official", sort_order: 6)
    end
  end
end
