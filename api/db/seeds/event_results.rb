puts "Seeding event results..."

def parse_division(division_str)
  # Parse "Male Black Adult Open Weight" into components
  parts = division_str.strip.split(' ')

  gender = parts[0]&.downcase  # Male/Female
  belt = parts[1]&.downcase    # White/Blue/Purple/Brown/Black

  # Age category is after belt
  age_raw = parts[2]&.downcase
  age_category = case age_raw
                 when 'juvenile' then 'juvenile'
                 when 'adult' then 'adult'
                 when 'master' then "master_#{parts[3]}"
                 else 'adult'
                 end

  # Weight class is everything after age (and master number if present)
  weight_start = age_raw == 'master' ? 4 : 3
  weight_raw = parts[weight_start..].join(' ').downcase
  weight_class = weight_raw.gsub(' ', '_')

  { gender: gender, belt_rank: belt, age_category: age_category, weight_class: weight_class }
end

def seed_results_from_text(file_path)
  content = File.read(file_path)
  lines = content.lines.map(&:strip)

  # Extract event slug
  slug_line = lines.find { |l| l.start_with?('SLUG:') }
  return puts "No SLUG found in #{file_path}" unless slug_line

  slug = slug_line.split('SLUG:').last.strip
  event = Event.find_by(slug: slug)
  return puts "Event not found: #{slug}" unless event

  # Clear existing results for this event
  event.event_results.delete_all

  current_division = nil
  results_count = 0

  lines.each do |line|
    if line.start_with?('#####')
      current_division = line.gsub('#####', '').strip
    elsif line.match?(/^\d+(st|nd|rd)\|/) && current_division
      parts = line.split('|')
      placement_str = parts[0].strip
      placement = placement_str.gsub(/\D/, '').to_i

      parsed = parse_division(current_division)

      EventResult.create!(
        event: event,
        division: current_division,
        gender: parsed[:gender],
        belt_rank: parsed[:belt_rank],
        age_category: parsed[:age_category],
        weight_class: parsed[:weight_class],
        placement: placement,
        competitor_name: parts[1]&.strip,
        academy: parts[2]&.strip,
        country_code: parts[3]&.strip
      )
      results_count += 1
    end
  end

  puts "Seeded #{results_count} results for #{event.name}"
end

# Seed all result files
Dir[Rails.root.join('db/seeds/event_results_*.txt')].sort.each do |file|
  seed_results_from_text(file)
end

puts "Event results seeding complete!"
