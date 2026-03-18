class AsjjfVerifiedEventDataSync < ActiveRecord::Migration[8.1]
  def up
    # Manila GI — ASJJF eventInfo/1923
    Event.find_by(slug: "marianas-pro-manila-2026")&.update!(
      venue_address: "Lower Ground B, Gateway 2 Mall, 135 General Araneta, Cubao, Quezon City Metro Manila"
    )

    # Taiwan GI — ASJJF eventInfo/1943
    Event.find_by(slug: "marianas-pro-taiwan-2026")&.update!(
      venue_address: "No.100, Songjin Street, Xinyi District, Taipei City 110"
    )

    # Korea GI — ASJJF eventInfo/1909
    Event.find_by(slug: "marianas-pro-korea-2026")&.update!(
      venue_name: "Exhibition Hall 2, SETEC",
      venue_address: "3104 Nambusunhwan-ro, Gangnam-gu, Seoul"
    )

    # Hong Kong GI — ASJJF eventInfo/1899
    Event.find_by(slug: "marianas-pro-hong-kong-2026")&.update!(
      venue_address: "7 Lam Hing Street, Kowloon Bay, Hong Kong"
    )

    # Nagoya GI — ASJJF eventInfo/1863 (4-star event)
    Event.find_by(slug: "marianas-pro-nagoya-2026")&.update!(
      venue_name: "Aichi Budokan",
      venue_address: "Minato Ward, Marunouchi 1, Nagoya, Aichi"
    )

    # Copa de Marianas — ASJJF eventInfo/1837
    Event.find_by(slug: "copa-de-marianas-2026")&.update!(
      venue_address: "303 University Dr, Mangilao, 96913, Guam"
    )

    # Dumau Open — same UOG venue, use full address
    Event.find_by(slug: "guam-marianas-dumau-open-2026")&.update!(
      venue_address: "303 University Dr, Mangilao, 96913, Guam"
    )

    # Main Event — same UOG venue, use full address
    Event.find_by(slug: "marianas-open-2026")&.update!(
      venue_address: "303 University Dr, Mangilao, 96913, Guam"
    )

    # Nagoya trip packages — this event also has prizes per ASJJF
    add_nagoya_prizes
  end

  def down
    Event.find_by(slug: "marianas-pro-manila-2026")&.update!(
      venue_address: "Upper Ground B, Gateway 2 Mall, 135 General Araneta, Cubao"
    )
    Event.find_by(slug: "marianas-pro-taiwan-2026")&.update!(
      venue_address: "Taipei Xin-Yi Sports Center 6F"
    )
    Event.find_by(slug: "marianas-pro-korea-2026")&.update!(
      venue_name: "SETEC 2 Exhibition Hall",
      venue_address: "3104 Nambusoonhwanro (514 Daechi-Dong), Gangnam-gu"
    )
    Event.find_by(slug: "marianas-pro-hong-kong-2026")&.update!(
      venue_address: "Kellett School"
    )
    Event.find_by(slug: "marianas-pro-nagoya-2026")&.update!(
      venue_name: "Aichi Budokan Sports Complex",
      venue_address: "Aichi Budokan Sports Complex"
    )
    Event.find_by(slug: "copa-de-marianas-2026")&.update!(
      venue_address: "UOG Calvo Fieldhouse"
    )
    Event.find_by(slug: "guam-marianas-dumau-open-2026")&.update!(
      venue_address: "University of Guam Calvo Fieldhouse"
    )
    Event.find_by(slug: "marianas-open-2026")&.update!(
      venue_address: "UOG Calvo Fieldhouse"
    )

    Event.find_by(slug: "marianas-pro-nagoya-2026")&.prize_categories&.destroy_all
  end

  private

  def add_nagoya_prizes
    event = Event.find_by(slug: "marianas-pro-nagoya-2026")
    return unless event

    event.prize_categories.destroy_all
    [
      "Male Blue Juvenile Open Weight — 1 Trip Package",
      "Male Adult Blue Open Weight — 1 Trip Package",
      "Male Adult Purple Open Weight — 1 Trip Package",
      "Male Adult Brown Open Weight — 1 Trip Package",
      "Male Adult Black Open Weight — 1 Trip Package",
      "Female Blue Juvenile Open Weight — 1 Trip Package",
      "Female Adult Blue Open Weight — 1 Trip Package",
      "Female Adult Purple Open Weight — 1 Trip Package",
      "Female Adult Brown Open Weight — 1 Trip Package",
      "Female Adult Black Open Weight — 1 Trip Package",
      "Male Black Master 30 Open Weight — 1 Trip Package",
      "Male Black Master 41 Open Weight — 1 Trip Package",
      "Female Black Master 30 Open Weight — 1 Trip Package",
      "Teams Adult/Masters Overall (Gi + No-Gi) — 1st Place: 2 Trip Packages",
      "Teams Adult/Masters Overall (Gi + No-Gi) — 2nd Place: 1 Trip Package",
      "Teams Adult/Masters Overall (Gi + No-Gi) — 3rd Place: 1 Trip Package",
    ].each_with_index do |name, i|
      event.prize_categories.create!(name: name, amount: 0, sort_order: i + 1)
    end
  end
end
