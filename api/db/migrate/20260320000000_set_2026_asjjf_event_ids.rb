class Set2026AsjjfEventIds < ActiveRecord::Migration[8.1]
  ASJJF_IDS_2026 = {
    "copa-de-marianas-2026"        => [1837, 1838],
    "marianas-pro-nagoya-2026"     => [1863, 1864],
    "marianas-pro-manila-2026"     => [1923, 1924],
    "marianas-pro-taiwan-2026"     => [1943, 1944],
    "marianas-pro-korea-2026"      => [1909, 1910],
    "marianas-pro-hong-kong-2026"  => [1899, 1900],
  }.freeze

  def up
    ASJJF_IDS_2026.each do |slug, ids|
      event = Event.find_by(slug: slug)
      event&.update_columns(asjjf_event_ids: ids)
    end
  end

  def down
    ASJJF_IDS_2026.each_key do |slug|
      event = Event.find_by(slug: slug)
      event&.update_columns(asjjf_event_ids: [])
    end
  end
end
