class FixAsjjfRegistrationUrls < ActiveRecord::Migration[8.1]
  # Correct ASJJF event IDs verified against marianasopen.com (old site) on 2026-03-13.
  # Previous seeds.rb used placeholder IDs (1865-1868) that pointed to unrelated tournaments.
  CORRECTIONS = {
    "marianas-pro-manila-2026"    => "https://asjjf.org/main/eventInfo/1923",
    "marianas-pro-taiwan-2026"    => "https://asjjf.org/main/eventInfo/1943",
    "marianas-pro-korea-2026"     => "https://asjjf.org/main/eventInfo/1909",
    "marianas-pro-hong-kong-2026" => "https://asjjf.org/main/eventInfo/1899",
  }.freeze

  def up
    CORRECTIONS.each do |slug, url|
      execute <<~SQL
        UPDATE events
        SET registration_url = #{connection.quote(url)}
        WHERE slug = #{connection.quote(slug)}
      SQL
    end
  end

  def down
    # Restore placeholder IDs (these were wrong — only here for reversibility)
    {
      "marianas-pro-manila-2026"    => "https://asjjf.org/main/eventInfo/1865",
      "marianas-pro-taiwan-2026"    => "https://asjjf.org/main/eventInfo/1866",
      "marianas-pro-korea-2026"     => "https://asjjf.org/main/eventInfo/1867",
      "marianas-pro-hong-kong-2026" => "https://asjjf.org/main/eventInfo/1868",
    }.each do |slug, url|
      execute <<~SQL
        UPDATE events
        SET registration_url = #{connection.quote(url)}
        WHERE slug = #{connection.quote(slug)}
      SQL
    end
  end
end
