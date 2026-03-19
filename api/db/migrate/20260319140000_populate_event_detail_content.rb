class PopulateEventDetailContent < ActiveRecord::Migration[8.1]
  def up
    content_map.each do |slug, attrs|
      Event.find_by(slug: slug)&.update!(attrs)
    end
  end

  def down
    content_map.each_key do |slug|
      Event.find_by(slug: slug)&.update!(
        tagline: nil,
        schedule_note: nil,
        venue_highlights: [],
        registration_steps: [],
        travel_description: nil,
        travel_items: [],
        visa_description: nil,
        visa_items: []
      )
    end
  end

  private

  def content_map
    {
      "copa-de-marianas-2026" => {
        tagline: "Season Opener"
      },
      "marianas-pro-nagoya-2026" => {
        tagline: "Official Qualifier"
      },
      "marianas-pro-manila-2026" => {
        tagline: "Official Qualifier",
        venue_highlights: [
          { title: "Gateway Mall 2", description: "Quantum Skyview Deck, Upper Ground B" },
          { title: "Quezon City", description: "Metro Manila, Philippines" }
        ],
        registration_steps: [
          { title: "Visit ASJJF.org", description: "Open the official ASJJF event page for Guam Marianas Pro Manila 2026 and review the published event information.", url: "https://asjjf.org/main/eventInfo/1923", link_label: "Open ASJJF event page" },
          { title: "Select Your Division", description: "Confirm your age, belt, and weight division for the Manila event before completing checkout." },
          { title: "Complete Registration", description: "Finish payment before the registration deadline on April 15, 2026. Corrections close on April 17, 2026." }
        ],
        travel_description: "Plan your trip to Quezon City, Metro Manila. The competition venue at Gateway Mall 2 is inside Araneta City, with the official athlete hotel just a short walk from the mats.",
        travel_items: [
          { title: "Arrival Airport", value: "MNL", description: "Fly into Ninoy Aquino International Airport (MNL) and plan ground transportation to Araneta City in Quezon City." },
          { title: "Venue Access", description: "Gateway Mall 2 and Ibis Styles Manila Araneta City are both inside the Araneta City complex, making venue access easy once you arrive." }
        ],
        visa_description: "Entry rules vary by passport and travel purpose. Confirm the latest Philippines entry requirements before booking flights or accommodations.",
        visa_items: [
          { title: "Passport Check", description: "Make sure your passport validity and any required entry permissions meet current Philippines travel rules for your nationality." },
          { title: "Travel Documents", description: "Bring your passport, booking confirmations, and any onward-travel or arrival documents required by your airline or immigration." }
        ]
      },
      "marianas-pro-taiwan-2026" => {
        tagline: "Official Qualifier"
      },
      "marianas-pro-korea-2026" => {
        tagline: "Official Qualifier"
      },
      "guam-marianas-dumau-open-2026" => {
        tagline: "Road to the Open"
      },
      "marianas-pro-hong-kong-2026" => {
        tagline: "Official Qualifier"
      },
      "marianas-open-2026" => {
        tagline: "The Grand Championship",
        venue_highlights: [
          { title: "6 Competition Mats", description: "5,000+ Capacity" },
          { title: "University of Guam", description: "Mangilao, Guam 96913" }
        ]
      }
    }
  end
end
