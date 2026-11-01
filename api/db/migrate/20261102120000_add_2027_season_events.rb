# Publishes the 2027 Marianas events that ASJJF already lists on its 2027
# tournament calendar (https://asjjf.org/main/eventsBySeason/381), verified
# against each event's ASJJF page on 2026-11-02.
#
# Only facts stated on ASJJF are recorded. Fields ASJJF does not state yet
# (star rating, fees, schedules, prizes, images, taglines) stay blank so the
# site never shows invented details. Registration windows for Manila and Taiwan
# are omitted because ASJJF still lists provisional dates for them.
class Add2027SeasonEvents < ActiveRecord::Migration[8.1]
  ORGANIZATION_SLUG = "marianas-open".freeze

  COPA_FEE_SECTIONS = [
    {
      "title" => "Kids",
      "rows" => [
        { "deadline" => "Until November 21, 2026", "fee" => "$55", "option" => "Weight division" },
        { "deadline" => "Until January 3, 2027", "fee" => "$75", "option" => "Weight division" },
        { "deadline" => "Until January 13, 2027", "fee" => "$95", "option" => "Weight division" },
        { "deadline" => "Until January 21, 2027", "fee" => "$115", "option" => "Weight division" }
      ]
    },
    {
      "title" => "Adults",
      "rows" => [
        { "deadline" => "Until November 21, 2026", "fee" => "$65", "option" => "Weight division" },
        { "deadline" => "Until November 21, 2026", "fee" => "$85", "option" => "Weight division + open weight" },
        { "deadline" => "Until January 3, 2027", "fee" => "$95", "option" => "Weight division" },
        { "deadline" => "Until January 3, 2027", "fee" => "$115", "option" => "Weight division + open weight" },
        { "deadline" => "Until January 13, 2027", "fee" => "$125", "option" => "Weight division" },
        { "deadline" => "Until January 13, 2027", "fee" => "$145", "option" => "Weight division + open weight" },
        { "deadline" => "Until January 21, 2027", "fee" => "$155", "option" => "Weight division" },
        { "deadline" => "Until January 21, 2027", "fee" => "$175", "option" => "Weight division + open weight" }
      ]
    }
  ].freeze

  TOKYO_FEE_SECTIONS = [
    {
      "title" => "Kids",
      "rows" => [
        { "deadline" => "Until November 10, 2026", "fee" => "¥8,800", "option" => "Weight division" },
        { "deadline" => "Until December 10, 2026", "fee" => "¥9,900", "option" => "Weight division" },
        { "deadline" => "Until January 10, 2027", "fee" => "¥10,900", "option" => "Weight division" },
        { "deadline" => "Until February 10, 2027", "fee" => "¥11,900", "option" => "Weight division" }
      ]
    },
    {
      "title" => "Adults",
      "rows" => [
        { "deadline" => "Until November 10, 2026", "fee" => "¥8,800", "option" => "Weight division" },
        { "deadline" => "Until November 10, 2026", "fee" => "¥11,800", "option" => "Weight division + open weight" },
        { "deadline" => "Until December 10, 2026", "fee" => "¥9,900", "option" => "Weight division" },
        { "deadline" => "Until December 10, 2026", "fee" => "¥12,900", "option" => "Weight division + open weight" },
        { "deadline" => "Until January 10, 2027", "fee" => "¥10,900", "option" => "Weight division" },
        { "deadline" => "Until January 10, 2027", "fee" => "¥13,900", "option" => "Weight division + open weight" },
        { "deadline" => "Until February 10, 2027", "fee" => "¥11,900", "option" => "Weight division" },
        { "deadline" => "Until February 10, 2027", "fee" => "¥14,900", "option" => "Weight division + open weight" }
      ]
    }
  ].freeze

  EVENTS = [
    {
      slug: "copa-de-marianas-2027",
      name: "Guam Copa de Marianas 2027",
      description: "Kick off 2027 with one of Guam's premier Brazilian Jiu-Jitsu competitions — " \
                   "the 2027 Guam Copa de Marianas Gi & No-Gi tournament.",
      date: Date.new(2027, 1, 30),
      end_date: nil,
      venue_name: "UOG Calvo Fieldhouse",
      venue_address: "303 University Dr, Mangilao, 96913, Guam",
      city: "Mangilao",
      country: "Guam",
      country_code: "GU",
      asjjf_stars: 3,
      asjjf_event_ids: [ 2258, 2259 ],
      registration_url_gi: "https://asjjf.org/main/eventInfo/2258",
      registration_url_nogi: "https://asjjf.org/main/eventInfo/2259",
      registration_fee_sections: COPA_FEE_SECTIONS,
      registration_info_items: [
        { "label" => "Registration closes", "value" => "Thursday, January 21, 2027 at 11:59 PM (ChST). Registration may close earlier if divisions reach capacity." },
        { "label" => "Athlete and coach corrections", "value" => "Until Saturday, January 23, 2027 at 11:59 PM (ChST)" },
        { "label" => "Schedule and brackets", "value" => "Released Thursday or Friday, January 28–29, 2027" },
        { "label" => "Gi and No-Gi", "value" => "Gi and No-Gi have separate ASJJF registration pages. Athletes competing in both must register on each page." },
        { "label" => "Questions", "value" => "moguam@marianasopen.com" }
      ]
    },
    {
      slug: "marianas-pro-tokyo-2027",
      name: "Guam Marianas Pro Tokyo 2027",
      description: "Organized by the Marianas Sport Jiu Jitsu Federation (MSJJF) in partnership with ASJJF.",
      date: Date.new(2027, 2, 20),
      end_date: nil,
      venue_name: "Komazawa Okunai Kyugijo (Indoor Ball Court)",
      venue_address: "Komazawa Koen 1-1, Setagaya, Tokyo, Japan",
      city: "Tokyo",
      country: "Japan",
      country_code: "JP",
      asjjf_stars: 4,
      asjjf_event_ids: [ 2233, 2234 ],
      registration_url_gi: "https://asjjf.org/main/eventInfo/2233",
      registration_url_nogi: "https://asjjf.org/main/eventInfo/2234",
      registration_fee_sections: TOKYO_FEE_SECTIONS,
      registration_info_items: [
        { "label" => "Registration closes", "value" => "Wednesday, February 10, 2027 at 11:59 PM (JST). Registration may close early once capacity is reached." },
        { "label" => "Athlete and coach corrections", "value" => "Until Friday, February 12, 2027 at 11:59 PM (JST)" },
        { "label" => "Schedule and brackets", "value" => "Published Thursday, February 18, 2027" },
        { "label" => "Spectator admission", "value" => "Free" }
      ]
    },
    {
      slug: "marianas-pro-manila-2027",
      name: "Guam Marianas Pro Manila 2027",
      description: nil,
      date: Date.new(2027, 4, 24),
      end_date: Date.new(2027, 4, 25),
      venue_name: "Gateway 2 Mall, Quantum Skyview Deck",
      venue_address: "Upper Ground B, Gateway 2 Mall, 135 General Araneta, Cubao, Quezon City, Metro Manila, Philippines",
      city: "Quezon City",
      country: "Philippines",
      country_code: "PH",
      asjjf_stars: nil,
      asjjf_event_ids: [ 2211, 2212 ],
      registration_url_gi: "https://asjjf.org/main/eventInfo/2211",
      registration_url_nogi: "https://asjjf.org/main/eventInfo/2212",
      registration_fee_sections: [],
      registration_info_items: []
    },
    {
      slug: "marianas-pro-taiwan-2027",
      name: "Guam Marianas Pro Taiwan 2027",
      description: nil,
      date: Date.new(2027, 5, 22),
      end_date: Date.new(2027, 5, 23),
      venue_name: "Taipei Xin-Yi Sports Center 6F",
      venue_address: "No. 100, Songqin Street, Xinyi District, Taipei City 110",
      city: "Taipei",
      country: "Taiwan",
      country_code: "TW",
      asjjf_stars: nil,
      asjjf_event_ids: [ 2235, 2236 ],
      registration_url_gi: "https://asjjf.org/main/eventInfo/2235",
      registration_url_nogi: "https://asjjf.org/main/eventInfo/2236",
      registration_fee_sections: [],
      registration_info_items: []
    }
  ].freeze

  def up
    organization = Organization.find_by(slug: ORGANIZATION_SLUG)
    return unless organization

    EVENTS.each do |attributes|
      # Never overwrite an event an administrator has already created or edited.
      next if organization.events.exists?(slug: attributes[:slug])

      organization.events.create!(
        attributes.merge(
          status: "upcoming",
          is_main_event: false,
          ticket_sales_status: "unavailable"
        )
      )
    end
  end

  def down
    raise ActiveRecord::IrreversibleMigration,
          "2027 events may have been edited by administrators after publication"
  end
end
