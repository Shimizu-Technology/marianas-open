class UpdateManilaAccommodationDetails < ActiveRecord::Migration[8.1]
  def up
    accommodation = find_or_build_manila_accommodation
    return unless accommodation

    accommodation.update!(updated_attributes)
  end

  def down
    accommodation = find_or_build_manila_accommodation
    return unless accommodation

    accommodation.update!(previous_attributes)
  end

  private

  def find_or_build_manila_accommodation
    event = Event.find_by(slug: "marianas-pro-manila-2026")
    return unless event

    event.event_accommodations.where(hotel_name: [
      "Ibis Styles Manila Araneta",
      "Ibis Styles Manila Araneta City"
    ]).first_or_initialize
  end

  def updated_attributes
    {
      hotel_name: "Ibis Styles Manila Araneta City",
      description: <<~TEXT.strip,
        Athlete accommodation support for Guam Marianas Pro Manila 2026.

        How to book:
        Send your reservation request to the emails below with the subject line "Marianas Pro Manila Special Group Rates".

        Include the following information:
        1. Guest names
        2. Stay dates
        3. Preferred room type
        4. Estimated time of arrival (ETA)
        5. Flight details (if airport pickup is needed)

        Stay just steps away from the action at Ibis Styles Manila Araneta City, located directly within the Gateway Mall 2 complex. The Quantum Skyview venue is only a few minutes' walk from the hotel lobby.
      TEXT
      room_types: <<~TEXT.strip,
        Standard Twin
        - Occupancy: Double

        Family Room
        - Occupancy: Max 2 adults + 2 kids or max 3 adults
      TEXT
      rate_info: <<~TEXT.strip,
        Accommodation support dates: April 25-28, 2026

        Standard Twin
        - Stay dates: April 23-26, 2026
        - Rate: Php 3,800 / night (~ USD 68*)

        Family Room
        - Stay dates: April 23-26, 2026
        - Rate: Php 7,800 / night (~ USD 140*)

        *USD rates are approximate and may vary depending on exchange rates at the time of booking.
      TEXT
      inclusions: nil,
      check_in_date: Date.new(2026, 4, 25),
      check_out_date: Date.new(2026, 4, 28),
      booking_url: nil,
      booking_code: "Marianas Pro Manila",
      contact_email: "H7090@accor.com, Michee.Crudo@accor.com",
      contact_phone: "+63 2 8248 8444",
      sort_order: 1,
      active: true
    }
  end

  def previous_attributes
    {
      hotel_name: "Ibis Styles Manila Araneta",
      description: "Official accommodation partner for the Guam Marianas Pro Manila 2026. Modern, city-themed rooms with stylish furnishings near the competition venue at Gateway 2 Mall.",
      room_types: "Standard Queen (21 sqm, max 2), Standard Twin (21 sqm, max 2), Family Bunk Bed (46 sqm, max 4)",
      rate_info: nil,
      inclusions: "Buffet Breakfast at Streats for 2 persons, In-room Internet access",
      check_in_date: Date.new(2026, 4, 25),
      check_out_date: Date.new(2026, 4, 28),
      booking_url: nil,
      booking_code: nil,
      contact_email: nil,
      contact_phone: nil,
      sort_order: 1,
      active: true
    }
  end
end
