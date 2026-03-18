class FixManilaVenueAddress < ActiveRecord::Migration[8.1]
  def up
    Event.find_by(slug: "marianas-pro-manila-2026")&.update!(
      venue_address: "Upper Ground B, Gateway 2 Mall, 135 General Araneta, Cubao, Quezon City Metro Manila"
    )
  end

  def down
    Event.find_by(slug: "marianas-pro-manila-2026")&.update!(
      venue_address: "Lower Ground B, Gateway 2 Mall, 135 General Araneta, Cubao, Quezon City Metro Manila"
    )
  end
end
