class AddHotelTanoSponsor < ActiveRecord::Migration[8.1]
  SPONSOR_NAME = "Hotel Tano Guam".freeze

  def up
    org = Organization.first
    return unless org

    sponsor = org.sponsors.find_or_initialize_by(name: SPONSOR_NAME)
    sponsor.assign_attributes(tier: "official", sort_order: 18)
    sponsor.save!
  end

  def down
    org = Organization.first
    return unless org

    org.sponsors.where(name: SPONSOR_NAME).destroy_all
  end
end
