class AddManilaAccommodation < ActiveRecord::Migration[8.1]
  def up
    event = Event.find_by(slug: "marianas-pro-manila-2026")
    return unless event

    event.event_accommodations.create!(
      hotel_name: "Ibis Styles Manila Araneta",
      description: "Official accommodation partner for the Guam Marianas Pro Manila 2026. Modern, city-themed rooms with stylish furnishings near the competition venue at Gateway 2 Mall.",
      room_types: "Standard Queen (21 sqm, max 2), Standard Twin (21 sqm, max 2), Family Bunk Bed (46 sqm, max 4)",
      inclusions: "Buffet Breakfast at Streats for 2 persons, In-room Internet access",
      check_in_date: "2026-04-25",
      check_out_date: "2026-04-28",
      sort_order: 1,
      active: true
    )
  end

  def down
    event = Event.find_by(slug: "marianas-pro-manila-2026")
    event&.event_accommodations&.destroy_all
  end
end
