class MigrateExistingRegistrationUrls < ActiveRecord::Migration[8.1]
  def up
    # Manila (1923/1924)
    Event.find_by(slug: "marianas-pro-manila-2026")&.update!(
      registration_url_gi: "https://asjjf.org/main/eventInfo/1923",
      registration_url_nogi: "https://asjjf.org/main/eventInfo/1924",
      registration_url: nil # Clearing legacy single field favor of split fields
    )

    # Taiwan (1943/1944)
    Event.find_by(slug: "marianas-pro-taiwan-2026")&.update!(
      registration_url_gi: "https://asjjf.org/main/eventInfo/1943",
      registration_url_nogi: "https://asjjf.org/main/eventInfo/1944",
      registration_url: nil
    )

    # Korea (1909/1910)
    Event.find_by(slug: "marianas-pro-korea-2026")&.update!(
      registration_url_gi: "https://asjjf.org/main/eventInfo/1909",
      registration_url_nogi: "https://asjjf.org/main/eventInfo/1910",
      registration_url: nil
    )

    # Hong Kong (1899/1900)
    Event.find_by(slug: "marianas-pro-hong-kong-2026")&.update!(
      registration_url_gi: "https://asjjf.org/main/eventInfo/1899",
      registration_url_nogi: "https://asjjf.org/main/eventInfo/1900",
      registration_url: nil
    )

    # Dumau (2007/2008)
    Event.find_by(slug: "guam-marianas-dumau-open-2026")&.update!(
      registration_url_gi: "https://asjjf.org/main/eventInfo/2007",
      registration_url_nogi: "https://asjjf.org/main/eventInfo/2008",
      registration_url: nil
    )

    # Copa (1837/1838) - Completed event, but good for historical accuracy
    Event.find_by(slug: "copa-de-marianas-2026")&.update!(
      registration_url_gi: "https://asjjf.org/main/eventInfo/1837",
      registration_url_nogi: "https://asjjf.org/main/eventInfo/1838",
      registration_url: nil
    )
  end

  def down
    # Revert to single field (using GI link as primary fallback)
    Event.where.not(registration_url_gi: nil).each do |event|
      event.update!(registration_url: event.registration_url_gi)
    end
  end
end
