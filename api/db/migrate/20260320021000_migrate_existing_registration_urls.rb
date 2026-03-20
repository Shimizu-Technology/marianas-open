class MigrateExistingRegistrationUrls < ActiveRecord::Migration[8.1]
  class Event < ActiveRecord::Base; end

  def up
    # Manila (1923/1924)
    Event.where(slug: "marianas-pro-manila-2026").update_all(
      registration_url_gi: "https://asjjf.org/main/eventInfo/1923",
      registration_url_nogi: "https://asjjf.org/main/eventInfo/1924",
      registration_url: nil
    )

    # Taiwan (1943/1944)
    Event.where(slug: "marianas-pro-taiwan-2026").update_all(
      registration_url_gi: "https://asjjf.org/main/eventInfo/1943",
      registration_url_nogi: "https://asjjf.org/main/eventInfo/1944",
      registration_url: nil
    )

    # Korea (1909/1910)
    Event.where(slug: "marianas-pro-korea-2026").update_all(
      registration_url_gi: "https://asjjf.org/main/eventInfo/1909",
      registration_url_nogi: "https://asjjf.org/main/eventInfo/1910",
      registration_url: nil
    )

    # Hong Kong (1899/1900)
    Event.where(slug: "marianas-pro-hong-kong-2026").update_all(
      registration_url_gi: "https://asjjf.org/main/eventInfo/1899",
      registration_url_nogi: "https://asjjf.org/main/eventInfo/1900",
      registration_url: nil
    )

    # Dumau (2007/2008)
    Event.where(slug: "guam-marianas-dumau-open-2026").update_all(
      registration_url_gi: "https://asjjf.org/main/eventInfo/2007",
      registration_url_nogi: "https://asjjf.org/main/eventInfo/2008",
      registration_url: nil
    )

    # Copa (1837/1838)
    Event.where(slug: "copa-de-marianas-2026").update_all(
      registration_url_gi: "https://asjjf.org/main/eventInfo/1837",
      registration_url_nogi: "https://asjjf.org/main/eventInfo/1838",
      registration_url: nil
    )
  end

  def down
    # Restore Manila
    Event.where(slug: "marianas-pro-manila-2026").update_all(
      registration_url: "https://asjjf.org/main/eventInfo/1923",
      registration_url_gi: nil,
      registration_url_nogi: nil
    )

    # Restore Taiwan
    Event.where(slug: "marianas-pro-taiwan-2026").update_all(
      registration_url: "https://asjjf.org/main/eventInfo/1943",
      registration_url_gi: nil,
      registration_url_nogi: nil
    )

    # Restore Korea
    Event.where(slug: "marianas-pro-korea-2026").update_all(
      registration_url: "https://asjjf.org/main/eventInfo/1909",
      registration_url_gi: nil,
      registration_url_nogi: nil
    )

    # Restore Hong Kong
    Event.where(slug: "marianas-pro-hong-kong-2026").update_all(
      registration_url: "https://asjjf.org/main/eventInfo/1899",
      registration_url_gi: nil,
      registration_url_nogi: nil
    )

    # Restore Dumau (to its original generic season URL)
    Event.where(slug: "guam-marianas-dumau-open-2026").update_all(
      registration_url: "https://asjjf.org/main/eventsBySeason/341",
      registration_url_gi: nil,
      registration_url_nogi: nil
    )

    # Restore Copa
    Event.where(slug: "copa-de-marianas-2026").update_all(
      registration_url: "https://asjjf.org/main/eventInfo/1837",
      registration_url_gi: nil,
      registration_url_nogi: nil
    )
  end
end

