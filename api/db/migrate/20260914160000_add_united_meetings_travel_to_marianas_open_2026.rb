class AddUnitedMeetingsTravelToMarianasOpen2026 < ActiveRecord::Migration[8.1]
  EVENT_SLUG = "marianas-open-2026"
  OFFER_KEY = "united-meetings-travel-2026"
  TRAVEL_DESCRIPTION = "Traveling to Guam for the Marianas Open? Use the meeting travel option below when searching for flights."
  OFFER = {
    key: OFFER_KEY,
    kind: "offer",
    title: "United Meetings Travel",
    description: "Enter this code on United's Meetings Travel page when searching for eligible flights to Guam. Fare availability and terms are provided by United.",
    code: "zsfx863836",
    url: "https://www.united.com/en/us/meetingtravel",
    link_label: "Search United flights"
  }.freeze

  def up
    event = Event.find_by(slug: EVENT_SLUG)
    return unless event

    travel_items = Array(event.travel_items).reject { |item| item.is_a?(Hash) && item["key"] == OFFER_KEY }
    event.update!(
      travel_description: event.travel_description.presence || TRAVEL_DESCRIPTION,
      travel_items: travel_items + [OFFER]
    )
  end

  def down
    event = Event.find_by(slug: EVENT_SLUG)
    return unless event

    travel_items = Array(event.travel_items).reject { |item| item.is_a?(Hash) && item["key"] == OFFER_KEY }
    event.update!(
      travel_description: event.travel_description == TRAVEL_DESCRIPTION ? nil : event.travel_description,
      travel_items: travel_items
    )
  end
end
