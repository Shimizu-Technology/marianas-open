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

    travel_items = Array(event.travel_items)
    attributes = { travel_description: event.travel_description.presence || TRAVEL_DESCRIPTION }

    unless travel_items.any? { |item| item.is_a?(Hash) && item["key"] == OFFER_KEY }
      attributes[:travel_items] = travel_items + [ OFFER ]
      attributes[:translations] = translations_with_offer(event.translations)
    end

    event.update!(attributes)
  end

  def down
    event = Event.find_by(slug: EVENT_SLUG)
    return unless event

    travel_items = Array(event.travel_items)
    inserted_offer_present = travel_items.any? { |item| offer_matches?(item) }
    attributes = {
      travel_description: event.travel_description == TRAVEL_DESCRIPTION ? nil : event.travel_description,
      travel_items: travel_items.reject { |item| offer_matches?(item) }
    }
    attributes[:translations] = translations_without_offer(event.translations) if inserted_offer_present

    event.update!(attributes)
  end

  private

  def offer_matches?(item)
    item.is_a?(Hash) && item.stringify_keys == OFFER.stringify_keys
  end

  def translations_with_offer(translations)
    updated = translations.deep_dup
    localized_items = updated["travel_items"]
    return updated unless localized_items.is_a?(Hash)

    localized_items.each do |locale, items|
      next unless items.is_a?(Array)
      next if items.any? { |item| item.is_a?(Hash) && item["key"] == OFFER_KEY }

      localized_items[locale] = items + [ OFFER.stringify_keys ]
    end
    updated
  end

  def translations_without_offer(translations)
    updated = translations.deep_dup
    localized_items = updated["travel_items"]
    return updated unless localized_items.is_a?(Hash)

    localized_items.each do |locale, items|
      next unless items.is_a?(Array)

      localized_items[locale] = items.reject { |item| translated_offer_matches?(item) }
    end
    updated
  end

  def translated_offer_matches?(item)
    item.is_a?(Hash) &&
      item["key"] == OFFER_KEY &&
      item["kind"] == OFFER[:kind] &&
      item["code"] == OFFER[:code] &&
      item["url"] == OFFER[:url]
  end
end
