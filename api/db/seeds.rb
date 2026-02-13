puts "Seeding Marianas Open data..."

# Clear existing data
Video.destroy_all
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
  # === 2026 Upcoming ===
  { name: "Copa de Marianas 2026", slug: "copa-de-marianas-2026", description: "The opening event of the 2026 Marianas Pro Series", date: "2026-01-31", end_date: nil, venue_name: "UOG Calvo Fieldhouse", venue_address: "UOG Calvo Fieldhouse", city: "Mangilao", country: "Guam", country_code: "GU", asjjf_stars: 3, is_main_event: false, registration_url: "https://asjjf.org/main/eventInfo/1837", status: "upcoming" },
  { name: "Marianas Pro Nagoya 2026", slug: "marianas-pro-nagoya-2026", description: "The Marianas Pro Series comes to Nagoya, Japan", date: "2026-03-14", end_date: nil, venue_name: "Aichi Budokan Sports Complex", venue_address: "Aichi Budokan Sports Complex", city: "Nagoya", country: "Japan", country_code: "JP", asjjf_stars: 4, is_main_event: false, registration_url: "https://asjjf.org/main/eventInfo/1863", status: "upcoming" },
  { name: "Marianas Pro Manila 2026", slug: "marianas-pro-manila-2026", description: "The Marianas Pro Series comes to Manila, Philippines", date: "2026-04-25", end_date: "2026-04-26", venue_name: "Quantum Skyview Gateway Mall 2", venue_address: "Quantum Skyview Gateway Mall 2", city: "Manila", country: "Philippines", country_code: "PH", asjjf_stars: 3, is_main_event: false, registration_url: "https://asjjf.org/main/eventInfo/1865", status: "upcoming" },
  { name: "Marianas Pro Taiwan 2026", slug: "marianas-pro-taiwan-2026", description: "The Marianas Pro Series comes to Taipei, Taiwan", date: "2026-05-30", end_date: "2026-05-31", venue_name: "Taipei Xin-Yi Sports Center 6F", venue_address: "Taipei Xin-Yi Sports Center 6F", city: "Taipei", country: "Taiwan", country_code: "TW", asjjf_stars: 3, is_main_event: false, registration_url: "https://asjjf.org/main/eventInfo/1866", status: "upcoming" },
  { name: "Marianas Pro Korea 2026", slug: "marianas-pro-korea-2026", description: "The Marianas Pro Series comes to Seoul, South Korea", date: "2026-06-06", end_date: nil, venue_name: "Exhibition Hall 2", venue_address: "Exhibition Hall 2", city: "Seoul", country: "South Korea", country_code: "KR", asjjf_stars: 3, is_main_event: false, registration_url: "https://asjjf.org/main/eventInfo/1867", status: "upcoming" },
  { name: "Marianas Pro Hong Kong 2026", slug: "marianas-pro-hong-kong-2026", description: "The Marianas Pro Series comes to Hong Kong", date: "2026-07-18", end_date: "2026-07-19", venue_name: "Kellet School", venue_address: "Kellet School", city: "Hong Kong", country: "Hong Kong", country_code: "HK", asjjf_stars: 3, is_main_event: false, registration_url: "https://asjjf.org/main/eventInfo/1868", status: "upcoming" },
  { name: "Marianas Open 2026", slug: "marianas-open-2026", description: "The main event — Guam's Premier International Brazilian Jiu-Jitsu Championship", date: "2026-10-18", end_date: nil, venue_name: "UOG Calvo Fieldhouse", venue_address: "UOG Calvo Fieldhouse", city: "Mangilao", country: "Guam", country_code: "GU", asjjf_stars: 5, is_main_event: true, prize_pool: 50000, registration_url: "https://asjjf.org", status: "upcoming" },

  # === 2025 Completed ===
  { name: "Marianas Open 2025", slug: "marianas-open-2025", description: "The 18th annual Marianas Open International Championship", date: "2025-10-19", end_date: nil, venue_name: "UOG Calvo Fieldhouse", venue_address: "UOG Calvo Fieldhouse", city: "Mangilao", country: "Guam", country_code: "GU", asjjf_stars: 5, is_main_event: false, status: "completed" },
  { name: "Marianas Pro Tokyo 2025", slug: "marianas-pro-tokyo-2025", description: "Marianas Pro Series in Tokyo, Japan", date: "2025-04-12", end_date: nil, venue_name: "Sumida City Gymnasium", venue_address: "Sumida City Gymnasium", city: "Tokyo", country: "Japan", country_code: "JP", asjjf_stars: 4, is_main_event: false, status: "completed" },
  { name: "Marianas Pro Nagoya 2025", slug: "marianas-pro-nagoya-2025", description: "Marianas Pro Series in Nagoya, Japan", date: "2025-03-15", end_date: nil, venue_name: "Aichi Budokan Sports Complex", venue_address: "Aichi Budokan Sports Complex", city: "Nagoya", country: "Japan", country_code: "JP", asjjf_stars: 4, is_main_event: false, status: "completed" },
  { name: "Marianas Pro Manila 2025", slug: "marianas-pro-manila-2025", description: "Marianas Pro Series in Manila, Philippines", date: "2025-05-10", end_date: "2025-05-11", venue_name: "Quantum Skyview Gateway Mall 2", venue_address: "Quantum Skyview Gateway Mall 2", city: "Manila", country: "Philippines", country_code: "PH", asjjf_stars: 3, is_main_event: false, status: "completed" },
  { name: "Marianas Pro Taiwan 2025", slug: "marianas-pro-taiwan-2025", description: "Marianas Pro Series in Taipei, Taiwan", date: "2025-06-07", end_date: "2025-06-08", venue_name: "Taipei Xin-Yi Sports Center 6F", venue_address: "Taipei Xin-Yi Sports Center 6F", city: "Taipei", country: "Taiwan", country_code: "TW", asjjf_stars: 3, is_main_event: false, status: "completed" },

  # === 2024 Completed ===
  { name: "Marianas Open 2024", slug: "marianas-open-2024", description: "The 17th annual Marianas Open International Championship", date: "2024-10-20", end_date: nil, venue_name: "UOG Calvo Fieldhouse", venue_address: "UOG Calvo Fieldhouse", city: "Mangilao", country: "Guam", country_code: "GU", asjjf_stars: 5, is_main_event: false, status: "completed" },
  { name: "Copa De Marianas Guam 2024", slug: "copa-de-marianas-guam-2024", description: "Copa De Marianas tournament in Guam", date: "2024-01-27", end_date: nil, venue_name: "UOG Calvo Fieldhouse", venue_address: "UOG Calvo Fieldhouse", city: "Mangilao", country: "Guam", country_code: "GU", asjjf_stars: 3, is_main_event: false, status: "completed" },
  { name: "Marianas Pro Korea 2024", slug: "marianas-pro-korea-2024", description: "Marianas Pro Series in Seoul, South Korea", date: "2024-06-08", end_date: nil, venue_name: "Seoul Olympic Gymnasium", venue_address: "Seoul Olympic Gymnasium", city: "Seoul", country: "South Korea", country_code: "KR", asjjf_stars: 3, is_main_event: false, status: "completed" },
  { name: "Marianas Pro Japan 2024", slug: "marianas-pro-japan-2024", description: "Marianas Pro Series in Tokyo, Japan", date: "2024-04-13", end_date: nil, venue_name: "Sumida City Gymnasium", venue_address: "Sumida City Gymnasium", city: "Tokyo", country: "Japan", country_code: "JP", asjjf_stars: 4, is_main_event: false, status: "completed" },

  # === 2023 Completed ===
  { name: "Marianas Open 2023", slug: "marianas-open-2023", description: "The 16th annual Marianas Open International Championship", date: "2023-10-22", end_date: nil, venue_name: "UOG Calvo Fieldhouse", venue_address: "UOG Calvo Fieldhouse", city: "Mangilao", country: "Guam", country_code: "GU", asjjf_stars: 5, is_main_event: false, status: "completed" },
  { name: "Marianas Pro Manila 2023", slug: "marianas-pro-manila-2023", description: "Marianas Pro Series in Manila, Philippines", date: "2023-05-13", end_date: nil, venue_name: "Quantum Skyview Gateway Mall 2", venue_address: "Quantum Skyview Gateway Mall 2", city: "Manila", country: "Philippines", country_code: "PH", asjjf_stars: 3, is_main_event: false, status: "completed" },
  { name: "Marianas Pro Japan 2023", slug: "marianas-pro-japan-2023", description: "Marianas Pro Series in Tokyo, Japan", date: "2023-04-15", end_date: nil, venue_name: "Sumida City Gymnasium", venue_address: "Sumida City Gymnasium", city: "Tokyo", country: "Japan", country_code: "JP", asjjf_stars: 4, is_main_event: false, status: "completed" },

  # === 2022 Completed ===
  { name: "Copa De Marianas 2022", slug: "copa-de-marianas-2022", description: "Copa De Marianas tournament in Guam", date: "2022-01-29", end_date: nil, venue_name: "UOG Calvo Fieldhouse", venue_address: "UOG Calvo Fieldhouse", city: "Mangilao", country: "Guam", country_code: "GU", asjjf_stars: 3, is_main_event: false, status: "completed" },
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

# Videos — Real YouTube videos from the Marianas Open channel
marianas_open_2024 = Event.find_by(slug: "marianas-open-2024")
pro_korea_2024 = Event.find_by(slug: "marianas-pro-korea-2024")

videos_data = [
  {
    title: "Felipe Andrew vs Xavier Silva — Black Belt Final",
    youtube_url: "https://www.youtube.com/watch?v=FQ0-yZ7BcKM",
    competitor_1_name: "Felipe Andrew",
    competitor_2_name: "Xavier Silva",
    weight_class: "Open Class",
    belt_rank: "black",
    round: "Final",
    category: "gi",
    event: marianas_open_2024,
    featured: true,
    sort_order: 1,
  },
  {
    title: "Brandon Vera vs Kim Hee Dong — Brown Belt Open Class Final",
    youtube_url: "https://www.youtube.com/watch?v=ByggiTMFj8g",
    competitor_1_name: "Brandon Vera",
    competitor_2_name: "Kim Hee Dong",
    weight_class: "Open Class",
    belt_rank: "brown",
    round: "Final",
    category: "gi",
    event: marianas_open_2024,
    featured: true,
    sort_order: 2,
  },
  {
    title: "Milena Sakumoto vs Lenora Matanane — Female Black Belt Light Feather Final",
    youtube_url: "https://www.youtube.com/watch?v=NJUDb_Wk7PY",
    competitor_1_name: "Milena Sakumoto",
    competitor_2_name: "Lenora Matanane",
    weight_class: "Light Feather",
    belt_rank: "black",
    round: "Final",
    category: "gi",
    event: marianas_open_2024,
    featured: true,
    sort_order: 3,
  },
  {
    title: "Samkang Kim vs Sho Saito — Brown Belt Light Final",
    youtube_url: "https://www.youtube.com/watch?v=GUCQMe5ihu8",
    competitor_1_name: "Samkang Kim",
    competitor_2_name: "Sho Saito",
    weight_class: "Light",
    belt_rank: "brown",
    round: "Final",
    category: "gi",
    event: marianas_open_2024,
    sort_order: 4,
  },
  {
    title: "Yoko Abe vs Lee Yoonja — Female Master 3 Black Belt Heavy Final",
    youtube_url: "https://www.youtube.com/watch?v=DdDCm7k-jqY",
    competitor_1_name: "Yoko Abe",
    competitor_2_name: "Lee Yoonja",
    weight_class: "Heavy",
    belt_rank: "black",
    round: "Final",
    category: "gi",
    event: pro_korea_2024,
    sort_order: 5,
  },
  {
    title: "Yoon Minho vs Dave Kim — Black Belt Super Heavy Final",
    youtube_url: "https://www.youtube.com/watch?v=AvXKGOm4w5M",
    competitor_1_name: "Yoon Minho",
    competitor_2_name: "Dave Kim",
    weight_class: "Super Heavy",
    belt_rank: "black",
    round: "Final",
    category: "gi",
    event: pro_korea_2024,
    sort_order: 6,
  },
  {
    title: "Keenan Cornelius vs Mike Fowler — Black Belt Open Class Final (2015)",
    youtube_url: "https://www.youtube.com/watch?v=1wUPPmRxhkQ",
    competitor_1_name: "Keenan Cornelius",
    competitor_2_name: "Mike Fowler",
    weight_class: "Open Class",
    belt_rank: "black",
    round: "Final",
    category: "gi",
    event: nil,
    featured: true,
    sort_order: 7,
  },
  {
    title: "Marianas Open / Marianas Pro / Copa de Marianas — Highlight Reel",
    youtube_url: "https://www.youtube.com/watch?v=10I6UluJcRQ",
    category: "gi",
    event: nil,
    featured: false,
    sort_order: 8,
  },
]

videos_data.each do |data|
  event = data.delete(:event)
  video = Video.new(data)
  video.event = event
  video.status = 'published'
  video.save!
  puts "Created video: #{video.title}"
end

# Admin user
User.find_or_create_by!(email: "jerry.shimizutechnology@gmail.com") do |u|
  u.clerk_id = "pending_admin_#{SecureRandom.uuid}"
  u.first_name = "Jerry"
  u.last_name = "Shimizu"
  u.role = "admin"
end
puts "Created admin user"

puts "Seeding complete!"
