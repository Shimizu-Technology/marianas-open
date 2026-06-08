class UseDirectAsjjfRegistrationLinksFor2026Events < ActiveRecord::Migration[8.1]
  DIRECT_REGISTRATION_URLS = {
    "copa-de-marianas-2026" => [ nil, "https://asjjf.org/main/eventNotice/1837", "https://asjjf.org/main/eventNotice/1838" ],
    "marianas-pro-nagoya-2026" => [ nil, "https://asjjf.org/main/eventNotice/1863", "https://asjjf.org/main/eventNotice/1864" ],
    "marianas-pro-manila-2026" => [ nil, "https://asjjf.org/main/eventNotice/1923", "https://asjjf.org/main/eventNotice/1924" ],
    "marianas-pro-taiwan-2026" => [ nil, "https://asjjf.org/main/eventNotice/1943", "https://asjjf.org/main/eventNotice/1944" ],
    "marianas-pro-korea-2026" => [ nil, "https://asjjf.org/main/eventNotice/1909", "https://asjjf.org/main/eventNotice/1910" ],
    "guam-marianas-dumau-open-2026" => [ nil, "https://asjjf.org/main/eventNotice/2007", "https://asjjf.org/main/eventNotice/2008" ],
    "marianas-pro-hong-kong-2026" => [ nil, "https://asjjf.org/main/eventNotice/1899", "https://asjjf.org/main/eventNotice/1900" ],
    "marianas-open-2026" => [ nil, "https://asjjf.org/main/eventNotice/2062", "https://asjjf.org/main/eventNotice/2063" ]
  }.freeze

  PREVIOUS_REGISTRATION_URLS = {
    "copa-de-marianas-2026" => [ nil, "https://asjjf.org/main/eventInfo/1837", "https://asjjf.org/main/eventInfo/1838" ],
    "marianas-pro-nagoya-2026" => [ "https://asjjf.org/main/eventInfo/1863", nil, nil ],
    "marianas-pro-manila-2026" => [ nil, "https://asjjf.org/main/eventInfo/1923", "https://asjjf.org/main/eventInfo/1924" ],
    "marianas-pro-taiwan-2026" => [ nil, "https://asjjf.org/main/eventInfo/1943", "https://asjjf.org/main/eventInfo/1944" ],
    "marianas-pro-korea-2026" => [ nil, "https://asjjf.org/main/eventInfo/1909", "https://asjjf.org/main/eventInfo/1910" ],
    "guam-marianas-dumau-open-2026" => [ nil, "https://asjjf.org/main/eventInfo/2007", "https://asjjf.org/main/eventInfo/2008" ],
    "marianas-pro-hong-kong-2026" => [ nil, "https://asjjf.org/main/eventInfo/1899", "https://asjjf.org/main/eventInfo/1900" ],
    "marianas-open-2026" => [ "https://asjjf.org", "https://asjjf.org/main/eventInfo/2062", "https://asjjf.org/main/eventInfo/2063" ]
  }.freeze

  def up
    update_registration_urls(DIRECT_REGISTRATION_URLS)
  end

  def down
    update_registration_urls(PREVIOUS_REGISTRATION_URLS)
  end

  private

  def update_registration_urls(urls_by_slug)
    urls_by_slug.each do |slug, (legacy_url, gi_url, nogi_url)|
      execute <<~SQL.squish
        UPDATE events
        SET registration_url = #{quoted(legacy_url)},
            registration_url_gi = #{quoted(gi_url)},
            registration_url_nogi = #{quoted(nogi_url)},
            updated_at = CURRENT_TIMESTAMP
        WHERE slug = #{quoted(slug)};
      SQL
    end
  end

  def quoted(value)
    value.nil? ? "NULL" : connection.quote(value)
  end
end
