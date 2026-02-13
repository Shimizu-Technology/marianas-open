$stdout.sync = true
puts "Seeding event results..."

def parse_division(division_str)
  # Parse "Male Black Adult Open Weight" or "[GI] Male Black Adult Open Weight" into components
  # Strip [GI] / [NOGI] prefix if present
  clean = division_str.strip.sub(/^\[(GI|NOGI)\]\s*/, '')
  parts = clean.split(' ')

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
  # Handle "Juvenile 16-17" or "Adult 18" age qualifiers
  weight_start = if age_raw == 'master'
                   4
                 elsif parts[3]&.match?(/^\d/)
                   4 # skip age qualifier like "16-17" or "18"
                 else
                   3
                 end
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
  batch = []

  lines.each do |line|
    if line.start_with?('#####')
      current_division = line.gsub('#####', '').strip
    elsif line.match?(/^\d+(st|nd|rd)\|/) && current_division
      parts = line.split('|')
      placement = parts[0].strip.gsub(/\D/, '').to_i
      parsed = parse_division(current_division)

      batch << {
        event_id: event.id,
        division: current_division,
        gender: parsed[:gender],
        belt_rank: parsed[:belt_rank],
        age_category: parsed[:age_category],
        weight_class: parsed[:weight_class],
        placement: placement,
        competitor_name: parts[1]&.strip,
        academy: parts[2]&.strip,
        country_code: parts[3]&.strip,
        created_at: Time.current,
        updated_at: Time.current
      }
    end
  end

  EventResult.insert_all(batch) if batch.any?
  puts "Seeded #{batch.length} results for #{event.name}"
end

# Seed all result files
Dir[Rails.root.join('db/seeds/event_results_*.txt')].sort.each do |file|
  seed_results_from_text(file)
end

puts "Event results seeding complete!"
