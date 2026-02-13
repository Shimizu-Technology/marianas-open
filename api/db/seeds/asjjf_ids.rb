# Maps event slugs to their ASJJF event page IDs
# These are needed for the admin "Import Results from ASJJF" feature

ASJJF_IDS = {
  "marianas-open-2025" => [1732, 1759],      # gi + nogi
  "marianas-open-2024" => [1560],             # gi only
  "marianas-open-2023" => [1363],             # gi only
  "copa-de-marianas-2026" => [1647, 1648],    # gi + nogi
  "copa-de-marianas-guam-2024" => [1428],     # gi only
  "marianas-pro-tokyo-2025" => [1633],        # gi
  "marianas-pro-nagoya-2025" => [1634],       # gi
  "marianas-pro-manila-2025" => [1664, 1663], # gi + nogi
  "marianas-pro-manila-2023" => [1301],       # gi
  "marianas-pro-taiwan-2025" => [1693, 1694], # gi + nogi
  "marianas-pro-korea-2024" => [1514, 1515],  # gi + nogi
  "marianas-pro-japan-2024" => [1427],        # gi
  "marianas-pro-japan-2023" => [1251],        # gi
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
