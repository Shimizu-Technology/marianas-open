puts "Seeding Marianas Open data..."

# Clear existing data
PrizeCategory.destroy_all
EventScheduleItem.destroy_all
Event.destroy_all
Sponsor.destroy_all
Organization.destroy_all

images_path = Rails.root.join('..', 'web', 'public', 'images')

# Organization
org = Organization.create!(
  name: "Marianas Open",
  slug: "marianas-open",
  description: "Guam's Premier International Brazilian Jiu-Jitsu Championship",
  primary_color: "#004581",
  secondary_color: "#D4A843",
  contact_email: "steveshimizu@outlook.com",
  phone: "(671) 777-9044",
  website_url: "https://marianasopen.com",
  instagram_url: "https://instagram.com/themarianasopen",
  facebook_url: "https://facebook.com/marianasopen",
  founded_year: 2007
)

logo_path = images_path.join('logo.png')
if File.exist?(logo_path)
  org.logo.attach(io: File.open(logo_path), filename: 'logo.png', content_type: 'image/png')
end

banner_path = images_path.join('venue-crowd.webp')
if File.exist?(banner_path)
  org.banner.attach(io: File.open(banner_path), filename: 'banner.webp', content_type: 'image/webp')
end

puts "Created organization: #{org.name}"

# Events
hero_images = %w[action-match-1.webp action-match-2.webp action-match-3.webp action-match-4.webp podium-1.webp podium-2.webp venue-mats.webp]

events_data = [
  { name: "Copa de Marianas 2026", slug: "copa-de-marianas-2026", description: "The opening event of the 2026 Marianas Pro Series", date: "2026-01-31", end_date: nil, venue_name: "UOG Calvo Fieldhouse", venue_address: "UOG Calvo Fieldhouse", city: "Mangilao", country: "Guam", country_code: "GU", asjjf_stars: 3, is_main_event: false, status: "upcoming" },
  { name: "Marianas Pro Nagoya", slug: "marianas-pro-nagoya-2026", description: "The Marianas Pro Series comes to Nagoya, Japan", date: "2026-03-14", end_date: nil, venue_name: "Aichi Budokan Sports Complex", venue_address: "Aichi Budokan Sports Complex", city: "Nagoya", country: "Japan", country_code: "JP", asjjf_stars: 4, is_main_event: false, status: "upcoming" },
  { name: "Marianas Pro Manila", slug: "marianas-pro-manila-2026", description: "The Marianas Pro Series comes to Manila, Philippines", date: "2026-04-25", end_date: "2026-04-26", venue_name: "Quantum Skyview Gateway Mall 2", venue_address: "Quantum Skyview Gateway Mall 2", city: "Manila", country: "Philippines", country_code: "PH", asjjf_stars: 3, is_main_event: false, status: "upcoming" },
  { name: "Marianas Pro Taiwan", slug: "marianas-pro-taiwan-2026", description: "The Marianas Pro Series comes to Taipei, Taiwan", date: "2026-05-30", end_date: "2026-05-31", venue_name: "Taipei Xin-Yi Sports Center 6F", venue_address: "Taipei Xin-Yi Sports Center 6F", city: "Taipei", country: "Taiwan", country_code: "TW", asjjf_stars: 3, is_main_event: false, status: "upcoming" },
  { name: "Marianas Pro Korea", slug: "marianas-pro-korea-2026", description: "The Marianas Pro Series comes to Seoul, South Korea", date: "2026-06-06", end_date: nil, venue_name: "Exhibition Hall 2", venue_address: "Exhibition Hall 2", city: "Seoul", country: "South Korea", country_code: "KR", asjjf_stars: 3, is_main_event: false, status: "upcoming" },
  { name: "Marianas Pro Hong Kong", slug: "marianas-pro-hong-kong-2026", description: "The Marianas Pro Series comes to Hong Kong", date: "2026-07-18", end_date: "2026-07-19", venue_name: "Kellet School", venue_address: "Kellet School", city: "Hong Kong", country: "Hong Kong", country_code: "HK", asjjf_stars: 3, is_main_event: false, status: "upcoming" },
  { name: "Marianas Open 2026", slug: "marianas-open-2026", description: "The main event — Guam's Premier International Brazilian Jiu-Jitsu Championship", date: "2026-10-18", end_date: nil, venue_name: "UOG Calvo Fieldhouse", venue_address: "UOG Calvo Fieldhouse", city: "Mangilao", country: "Guam", country_code: "GU", asjjf_stars: 5, is_main_event: true, prize_pool: 50000, status: "upcoming" },
]

events_data.each_with_index do |data, i|
  event = org.events.create!(data)
  img_file = images_path.join(hero_images[i % hero_images.length])
  if File.exist?(img_file)
    event.hero_image.attach(io: File.open(img_file), filename: hero_images[i % hero_images.length], content_type: 'image/webp')
  end
  puts "Created event: #{event.name}"
end

# Main event schedule
main_event = Event.find_by!(slug: "marianas-open-2026")
[
  { time: "7:00 AM", description: "Doors Open / Weigh-ins", sort_order: 1 },
  { time: "8:00 AM", description: "Kids & Juvenile Divisions", sort_order: 2 },
  { time: "10:00 AM", description: "Adult White & Blue Belt", sort_order: 3 },
  { time: "1:00 PM", description: "Adult Purple & Brown Belt", sort_order: 4 },
  { time: "4:00 PM", description: "Black Belt Divisions", sort_order: 5 },
  { time: "6:00 PM", description: "Black Belt Finals / Open Class", sort_order: 6 },
  { time: "8:00 PM", description: "Awards Ceremony", sort_order: 7 },
].each { |item| main_event.event_schedule_items.create!(item) }
puts "Created schedule items for main event"

# Prize categories
[
  { name: "Black Belt Open Class (M)", amount: 10000, sort_order: 1 },
  { name: "Black Belt Open Class (F)", amount: 10000, sort_order: 2 },
  { name: "Black Belt Weight Divisions", amount: 15000, sort_order: 3 },
  { name: "Brown Belt Weight Divisions", amount: 5000, sort_order: 4 },
  { name: "Team Trophy", amount: 5000, sort_order: 5 },
  { name: "Kids Grand Champion (per division)", amount: 500, sort_order: 6 },
].each { |item| main_event.prize_categories.create!(item) }
puts "Created prize categories for main event"

# Sponsors
[
  { name: "ASJJF", tier: "title", sort_order: 1 },
  { name: "GVB (Guam Visitors Bureau)", tier: "title", sort_order: 2 },
  { name: "United Airlines", tier: "gold", sort_order: 3 },
  { name: "Hyatt Regency Guam", tier: "gold", sort_order: 4 },
  { name: "Dusit Thani Guam", tier: "gold", sort_order: 5 },
].each do |data|
  sponsor = org.sponsors.create!(data)
  puts "Created sponsor: #{sponsor.name}"
end

puts "Seeding complete!"
