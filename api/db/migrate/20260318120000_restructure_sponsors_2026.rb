class RestructureSponsors2026 < ActiveRecord::Migration[8.1]
  def up
    org = Organization.first
    return unless org

    Sponsor.where(name: [
      "Dusit Thani Guam",
      "Hyatt Regency Guam",
      "United Airlines",
      "Holiday Resort & Spa"
    ]).destroy_all

    gvb = Sponsor.find_by(name: "GVB (Guam Visitors Bureau)")
    gvb&.update!(tier: "presenting", sort_order: 1, website_url: "https://www.visitguam.com")

    asjjf = Sponsor.find_by(name: "ASJJF")
    asjjf&.update!(tier: "partner", sort_order: 1, website_url: "https://asjjf.org")

    new_sponsors = [
      { name: "ITE",              tier: "official", sort_order: 2, website_url: "https://shop.ite.net" },
      { name: "Hertz & Dollar",   tier: "official", sort_order: 3, website_url: "https://www.hertz.com/us/en/location/guam/guam/gumt50" },
      { name: "Stroll Guam",      tier: "official", sort_order: 4, website_url: "https://stroll.international" },
      { name: "IP&E & Shell",     tier: "official", sort_order: 5, website_url: nil },
      { name: "Holiday Resort & Spa", tier: "official", sort_order: 6, website_url: nil },
    ]

    new_sponsors.each do |data|
      next if Sponsor.exists?(name: data[:name], organization_id: org.id)
      org.sponsors.create!(data)
    end
  end

  def down
    Sponsor.where(name: ["ITE", "Hertz & Dollar", "Stroll Guam", "IP&E & Shell", "Holiday Resort & Spa"]).destroy_all

    gvb = Sponsor.find_by(name: "GVB (Guam Visitors Bureau)")
    gvb&.update!(tier: "title", sort_order: 2)

    asjjf = Sponsor.find_by(name: "ASJJF")
    asjjf&.update!(tier: "title", sort_order: 1)

    org = Organization.first
    return unless org
    Sponsor.create!(name: "United Airlines", tier: "gold", sort_order: 3, organization_id: org.id)
    Sponsor.create!(name: "Hyatt Regency Guam", tier: "gold", sort_order: 4, organization_id: org.id)
    Sponsor.create!(name: "Dusit Thani Guam", tier: "gold", sort_order: 5, organization_id: org.id)
  end
end
