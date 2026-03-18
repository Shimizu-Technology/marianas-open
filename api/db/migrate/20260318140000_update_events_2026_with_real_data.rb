class UpdateEvents2026WithRealData < ActiveRecord::Migration[8.1]
  def up
    org = Organization.first
    return unless org

    # ---------------------------------------------------------------
    # 1. Mark past events as completed
    # ---------------------------------------------------------------
    %w[copa-de-marianas-2026 marianas-pro-nagoya-2026].each do |slug|
      Event.find_by(slug: slug)&.update!(status: "completed")
    end

    # ---------------------------------------------------------------
    # 2. Update venue details from ASJJF verified data
    # ---------------------------------------------------------------

    # Manila — full address from ASJJF eventInfo/1923
    Event.find_by(slug: "marianas-pro-manila-2026")&.update!(
      venue_name: "Gateway 2 Mall, Quantum Skyview Deck",
      venue_address: "Upper Ground B, Gateway 2 Mall, 135 General Araneta, Cubao",
      city: "Quezon City",
      description: "The Marianas Pro Series comes to Manila, Philippines. Win your way to Guam to compete for $50,000 at the Marianas Open International Championship 2026!"
    )

    # Korea — full address from flyer
    Event.find_by(slug: "marianas-pro-korea-2026")&.update!(
      venue_name: "SETEC 2 Exhibition Hall",
      venue_address: "3104 Nambusoonhwanro (514 Daechi-Dong), Gangnam-gu",
      city: "Seoul",
      description: "The Marianas Pro Series comes to Seoul, South Korea. Win your way to Guam to compete for $50,000 at the Marianas Open International Championship 2026!"
    )

    # Hong Kong — fix spelling
    Event.find_by(slug: "marianas-pro-hong-kong-2026")&.update!(
      venue_name: "Kellett School",
      venue_address: "Kellett School",
      description: "The Marianas Pro Series comes to Hong Kong. Win your way to Guam to compete for $50,000 at the Marianas Open International Championship 2026!"
    )

    # Taiwan — update description
    Event.find_by(slug: "marianas-pro-taiwan-2026")&.update!(
      description: "The Marianas Pro Series comes to Taipei, Taiwan. Win your way to Guam to compete for $50,000 at the Marianas Open International Championship 2026!"
    )

    # Main event — update date to Oct 24-25 per Auntie Carm's prize data
    Event.find_by(slug: "marianas-open-2026")&.update!(
      date: "2026-10-24",
      end_date: "2026-10-25"
    )

    # ---------------------------------------------------------------
    # 3. Create Dumau Open — new event from ASJJF calendar
    # ---------------------------------------------------------------
    unless Event.exists?(slug: "guam-marianas-dumau-open-2026")
      org.events.create!(
        name: "Guam Marianas Dumau Open 2026",
        slug: "guam-marianas-dumau-open-2026",
        description: "The Guam Marianas Dumau Open — a Road to the Guam Open qualifying event at UOG Calvo Fieldhouse.",
        date: "2026-06-20",
        end_date: nil,
        venue_name: "University of Guam Calvo Fieldhouse",
        venue_address: "University of Guam Calvo Fieldhouse",
        city: "Mangilao",
        country: "Guam",
        country_code: "GU",
        asjjf_stars: 3,
        is_main_event: false,
        registration_url: "https://asjjf.org/main/eventsBySeason/341",
        status: "upcoming"
      )
    end

    # ---------------------------------------------------------------
    # 4. Add trip package prize categories for each Pro event
    # ---------------------------------------------------------------
    add_manila_prizes
    add_taiwan_prizes
    add_korea_prizes
    add_hong_kong_prizes
  end

  def down
    # Remove Dumau Open
    Event.find_by(slug: "guam-marianas-dumau-open-2026")&.destroy

    # Revert past events back to upcoming
    %w[copa-de-marianas-2026 marianas-pro-nagoya-2026].each do |slug|
      Event.find_by(slug: slug)&.update!(status: "upcoming")
    end

    # Revert main event date
    Event.find_by(slug: "marianas-open-2026")&.update!(
      date: "2026-10-18",
      end_date: nil
    )

    # Revert venue changes
    Event.find_by(slug: "marianas-pro-manila-2026")&.update!(
      venue_name: "Quantum Skyview Gateway Mall 2",
      venue_address: "Quantum Skyview Gateway Mall 2",
      city: "Manila",
      description: "The Marianas Pro Series comes to Manila, Philippines"
    )
    Event.find_by(slug: "marianas-pro-korea-2026")&.update!(
      venue_name: "Exhibition Hall 2",
      venue_address: "Exhibition Hall 2",
      city: "Seoul",
      description: "The Marianas Pro Series comes to Seoul, South Korea"
    )
    Event.find_by(slug: "marianas-pro-hong-kong-2026")&.update!(
      venue_name: "Kellet School",
      venue_address: "Kellet School",
      description: "The Marianas Pro Series comes to Hong Kong"
    )
    Event.find_by(slug: "marianas-pro-taiwan-2026")&.update!(
      description: "The Marianas Pro Series comes to Taipei, Taiwan"
    )

    # Remove prize categories for pro events
    %w[
      marianas-pro-manila-2026
      marianas-pro-taiwan-2026
      marianas-pro-korea-2026
      marianas-pro-hong-kong-2026
    ].each do |slug|
      Event.find_by(slug: slug)&.prize_categories&.destroy_all
    end
  end

  private

  # --- Manila (Apr 25-26) ---
  def add_manila_prizes
    event = Event.find_by(slug: "marianas-pro-manila-2026")
    return unless event

    event.prize_categories.destroy_all
    i = 0
    [
      # Individual trip packages
      "Male Adult Black Open Weight — 1 Trip Package",
      "Male Black Master 36 Open Weight — 1 Trip Package",
      # Team packages
      "Teams Adult/Masters Overall (Gi + No-Gi) — 1st Place: 4 Trip Packages",
      "Teams Adult/Masters Overall (Gi + No-Gi) — 2nd Place: 2 Trip Packages",
      "Teams Adult/Masters Overall (Gi + No-Gi) — 3rd Place: 1 Trip Package",
      "Teams Kids Overall (Gi + No-Gi) — 1st Place: 2 Trip Packages + 2 Parent Tickets",
      "Teams Kids Overall (Gi + No-Gi) — 2nd Place: 1 Trip Package + 1 Parent Ticket",
    ].each do |name|
      i += 1
      event.prize_categories.create!(name: name, amount: 0, sort_order: i)
    end
  end

  # --- Taiwan (May 30-31) ---
  def add_taiwan_prizes
    event = Event.find_by(slug: "marianas-pro-taiwan-2026")
    return unless event

    event.prize_categories.destroy_all
    i = 0
    [
      # Individual trip packages
      "Male Adult Blue Open Weight — 1 Trip Package",
      "Male Adult Purple Open Weight — 1 Trip Package",
      "Male Adult Brown Open Weight — 1 Trip Package",
      "Male Adult Black Open Weight — 1 Trip Package",
      "Male Black Master 36 Open Weight — 1 Trip Package",
      "Female Adult Blue Open Weight — 1 Trip Package",
      "Female Adult Purple Open Weight — 1 Trip Package",
      # Team packages
      "Teams Adult/Masters Overall (Gi + No-Gi) — 1st Place: 2 Trip Packages",
      "Teams Adult/Masters Overall (Gi + No-Gi) — 2nd Place: 1 Trip Package",
      "Teams Adult/Masters Overall (Gi + No-Gi) — 3rd Place: 1 Trip Package",
      "Teams Kids Overall (Gi + No-Gi) — 1st Place: 1 Trip Package + 1 Parent Ticket",
      "Teams Kids Overall (Gi + No-Gi) — 2nd Place: 1 Trip Package + 1 Parent Ticket",
    ].each do |name|
      i += 1
      event.prize_categories.create!(name: name, amount: 0, sort_order: i)
    end
  end

  # --- Korea (Jun 6) ---
  def add_korea_prizes
    event = Event.find_by(slug: "marianas-pro-korea-2026")
    return unless event

    event.prize_categories.destroy_all
    i = 0
    [
      # Individual trip packages
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
      "Male Brown Master 30 Open Weight — 1 Trip Package",
      "Male Black Master 30 Open Weight — 1 Trip Package",
      # Team packages
      "Teams Adult/Masters Overall (Gi + No-Gi) — 1st Place: 2 Trip Packages",
      "Teams Adult/Masters Overall (Gi + No-Gi) — 2nd Place: 1 Trip Package",
      "Teams Adult/Masters Overall (Gi + No-Gi) — 3rd Place: 1 Trip Package",
    ].each do |name|
      i += 1
      event.prize_categories.create!(name: name, amount: 0, sort_order: i)
    end
  end

  # --- Hong Kong (Jul 18-19) ---
  def add_hong_kong_prizes
    event = Event.find_by(slug: "marianas-pro-hong-kong-2026")
    return unless event

    event.prize_categories.destroy_all
    i = 0
    [
      # Individual trip packages
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
      "Female Black Master 30 Open Weight — 1 Trip Package",
      "Male Black Master 30 Open Weight — 1 Trip Package",
      # Team packages
      "Teams Adult/Masters Overall (Gi + No-Gi) — 1st Place: 2 Trip Packages",
      "Teams Adult/Masters Overall (Gi + No-Gi) — 2nd Place: 1 Trip Package",
      "Teams Adult/Masters Overall (Gi + No-Gi) — 3rd Place: 1 Trip Package",
    ].each do |name|
      i += 1
      event.prize_categories.create!(name: name, amount: 0, sort_order: i)
    end
  end
end
