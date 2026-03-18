class UpdateSponsors2026 < ActiveRecord::Migration[8.1]
  def up
    Sponsor.where(name: ["Dusit Thani Guam", "Hyatt Regency Guam", "United Airlines"]).destroy_all

    org = Organization.first
    return unless org

    unless Sponsor.exists?(name: "Holiday Resort & Spa")
      Sponsor.create!(
        name: "Holiday Resort & Spa",
        tier: "gold",
        sort_order: 3,
        organization_id: org.id
      )
    end
  end

  def down
    Sponsor.where(name: "Holiday Resort & Spa").destroy_all

    org = Organization.first
    return unless org

    Sponsor.create!(name: "United Airlines", tier: "gold", sort_order: 3, organization_id: org.id)
    Sponsor.create!(name: "Hyatt Regency Guam", tier: "gold", sort_order: 4, organization_id: org.id)
    Sponsor.create!(name: "Dusit Thani Guam", tier: "gold", sort_order: 5, organization_id: org.id)
  end
end
