# Maps event slugs to their ASJJF event page IDs
# Needed for admin "Import Results from ASJJF" feature

ASJJF_IDS = {
  "marianas-open-2025" => [1732, 1759],
  "marianas-open-2024" => [1560],
  "marianas-open-2023" => [1363],
  "copa-de-marianas-2026" => [1647, 1648],
  "copa-de-marianas-guam-2024" => [1428],
  "marianas-pro-tokyo-2025" => [1633],
  "marianas-pro-nagoya-2025" => [1634],
  "marianas-pro-manila-2025" => [1664, 1663],
  "marianas-pro-manila-2023" => [1301],
  "marianas-pro-taiwan-2025" => [1693, 1694],
  "marianas-pro-korea-2024" => [1514, 1515],
  "marianas-pro-japan-2024" => [1427],
  "marianas-pro-japan-2023" => [1251],
}

puts "Setting ASJJF event IDs..."
ASJJF_IDS.each do |slug, ids|
  event = Event.find_by(slug: slug)
  if event
    event.update!(asjjf_event_ids: ids)
    puts "  #{slug}: #{ids.inspect}"
  else
    puts "  #{slug}: NOT FOUND (skipped)"
  end
end
puts "Done!"
