class AddHotelTanoAccommodation < ActiveRecord::Migration[8.1]
  ORGANIZATION_SLUG = "marianas-open".freeze
  EVENT_SLUG = "marianas-open-2026".freeze
  HOTEL_NAME = "Hotel Tano Guam".freeze
  HOTEL_URL = "https://www.hoteltano.com".freeze
  ACCOMMODATION_ATTRIBUTES = {
    hotel_name: HOTEL_NAME,
    description: <<~TEXT.strip,
      Official partner hotel for the 2026 Guam Marianas Open International Championship. Stay close to the action with a dedicated friends and family rate.

      Hotel address
      1000 Pale San Vitores Road, Tumon, Guam 96913
    TEXT
    rate_info: "Friends & Family rate",
    inclusions: <<~TEXT.strip,
      Swimming
      Fitness center
      24-hour store
      Wi-Fi
      Free parking
    TEXT
    booking_url: HOTEL_URL,
    booking_code: "tanosports",
    sort_order: 1,
    active: true
  }.freeze

  def up
    set_sponsor_website

    event = Event.find_by(slug: EVENT_SLUG)
    return unless event
    return if event.event_accommodations.exists?(hotel_name: HOTEL_NAME)

    event.event_accommodations.create!(ACCOMMODATION_ATTRIBUTES)
  end

  def down
    raise ActiveRecord::IrreversibleMigration,
          "Hotel Tano accommodation and sponsor ownership cannot be determined safely"
  end

  private

  def set_sponsor_website
    sponsor = Organization.find_by(slug: ORGANIZATION_SLUG)&.sponsors&.find_by(name: HOTEL_NAME)
    sponsor&.update!(website_url: HOTEL_URL) if sponsor&.website_url.blank?
  end
end
