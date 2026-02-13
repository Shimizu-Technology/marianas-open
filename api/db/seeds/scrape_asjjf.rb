#!/usr/bin/env ruby
# Scrapes ASJJF event results and saves to pipe-delimited text files
# Usage: ruby scrape_asjjf.rb
$stdout.sync = true

require 'net/http'
require 'uri'
require 'json'

EVENTS = {
  # [asjjf_id, type, slug, event_name]
  1732 => { type: 'gi', slug: 'marianas-open-2025', name: '2025 Marianas Open' },
  1759 => { type: 'nogi', slug: 'marianas-open-2025', name: '2025 Marianas Open' },
  1647 => { type: 'gi', slug: 'copa-de-marianas-2026', name: '2025 Copa De Marianas' },
  1648 => { type: 'nogi', slug: 'copa-de-marianas-2026', name: '2025 Copa De Marianas' },
  1633 => { type: 'gi', slug: 'marianas-pro-tokyo-2025', name: '2025 Marianas Pro Tokyo' },
  1634 => { type: 'gi', slug: 'marianas-pro-nagoya-2025', name: '2025 Marianas Pro Nagoya' },
  1693 => { type: 'gi', slug: 'marianas-pro-taiwan-2025', name: '2025 Marianas Pro Taiwan' },
  1694 => { type: 'nogi', slug: 'marianas-pro-taiwan-2025', name: '2025 Marianas Pro Taiwan' },
  1664 => { type: 'gi', slug: 'marianas-pro-manila-2025', name: '2025 Marianas Pro Manila' },
  1663 => { type: 'nogi', slug: 'marianas-pro-manila-2025', name: '2025 Marianas Pro Manila' },
  1560 => { type: 'gi', slug: 'marianas-open-2024', name: '2024 Marianas Open' },
  1428 => { type: 'gi', slug: 'copa-de-marianas-guam-2024', name: '2024 Copa De Marianas' },
  1427 => { type: 'gi', slug: 'marianas-pro-japan-2024', name: '2024 Marianas Pro Japan' },
  1514 => { type: 'gi', slug: 'marianas-pro-korea-2024', name: '2024 Marianas Pro Korea' },
  1515 => { type: 'nogi', slug: 'marianas-pro-korea-2024', name: '2024 Marianas Pro Korea' },
  1511 => { type: 'gi', slug: 'marianas-pro-manila-2024', name: '2024 Marianas Pro Manila' },
  1363 => { type: 'gi', slug: 'marianas-open-2023', name: '2023 Marianas Open' },
  1251 => { type: 'gi', slug: 'marianas-pro-japan-2023', name: '2023 Marianas Pro Japan' },
  1301 => { type: 'gi', slug: 'marianas-pro-manila-2023', name: '2023 Marianas Pro Manila' },
}

def fetch_results(asjjf_id)
  uri = URI("https://asjjf.org/main/eventResults/#{asjjf_id}")
  response = Net::HTTP.get_response(uri)
  return nil unless response.code == '200'
  response.body
end

def parse_results(html)
  results = []
  current_division = nil

  # The page has h5 tags for divisions and structured result entries
  # Let's parse the raw HTML
  
  # Extract text content - strip HTML tags but preserve structure
  # Look for division headers (h5 tags) and result entries
  
  # Find all h5 division headers
  divisions = html.scan(/<h5[^>]*>(.*?)<\/h5>/m)
  
  # Split by h5 tags to get sections
  sections = html.split(/<h5[^>]*>/)
  sections.shift # remove content before first h5
  
  sections.each_with_index do |section, i|
    # Get division name from the h5 content
    div_match = section.match(/^(.*?)<\/h5>/m)
    next unless div_match
    division_name = div_match[1].gsub(/<[^>]+>/, '').gsub(/&nbsp;/, ' ').gsub(/&amp;/, '&').strip.gsub(/\s+/, ' ')
    next if division_name.empty?
    
    rest = section[div_match.end(0)..]
    
    # Parse placement entries
    # Look for patterns: placement (1st/2nd/3rd), then name, academy, country
    # They appear in spans or divs
    text = rest.gsub(/<[^>]+>/, "\n").gsub(/&amp;/, '&').gsub(/&nbsp;/, ' ')
    lines = text.lines.map(&:strip).reject(&:empty?)
    
    i = 0
    while i < lines.length
      if lines[i] =~ /^(1st|2nd|3rd)$/
        placement = lines[i]
        name = lines[i + 1]&.strip
        academy = lines[i + 2]&.strip
        country = lines[i + 3]&.strip
        
        if name && academy && country && country.length <= 5
          results << {
            division: division_name,
            placement: placement,
            name: name,
            academy: academy,
            country: country
          }
          i += 4
        else
          i += 1
        end
      else
        i += 1
      end
    end
  end
  
  results
end

def write_results(slug, event_name, all_results, asjjf_ids_info)
  filename = "event_results_#{slug}.txt"
  filepath = File.join(__dir__, filename)
  
  File.open(filepath, 'w') do |f|
    f.puts "EVENT: #{event_name}"
    f.puts "SLUG: #{slug}"
    f.puts "ASJJF_IDS: #{asjjf_ids_info}"
    f.puts ""
    
    all_results.each do |r|
      f.puts "##### #{r[:division]}"  if r[:new_division]
      f.puts "#{r[:placement]}|#{r[:name]}|#{r[:academy]}|#{r[:country]}"
    end
  end
  
  puts "Wrote #{all_results.count} results to #{filename}"
end

# Group events by slug
by_slug = {}
EVENTS.each do |id, info|
  by_slug[info[:slug]] ||= []
  by_slug[info[:slug]] << [id, info]
end

by_slug.each do |slug, entries|
  all_results = []
  asjjf_ids = []
  event_name = entries.first[1][:name]
  
  entries.each do |asjjf_id, info|
    puts "Fetching ASJJF #{asjjf_id} (#{info[:name]} #{info[:type]})..."
    html = fetch_results(asjjf_id)
    unless html
      puts "  FAILED to fetch #{asjjf_id}"
      next
    end
    
    results = parse_results(html)
    
    # Prefix division names with [GI] or [NOGI] if there are multiple types
    has_multiple_types = entries.length > 1 && entries.map { |_, i| i[:type] }.uniq.length > 1
    
    current_div = nil
    results.each do |r|
      div_name = r[:division]
      div_name = "[#{info[:type].upcase}] #{div_name}" if has_multiple_types
      
      if div_name != current_div
        r[:new_division] = true
        current_div = div_name
      end
      r[:division] = div_name
    end
    
    all_results.concat(results)
    asjjf_ids << asjjf_id
    
    puts "  Parsed #{results.length} results"
    sleep 1 # be polite
  end
  
  next if all_results.empty?
  
  # Write file
  filepath = File.join(__dir__, "event_results_#{slug}.txt")
  File.open(filepath, 'w') do |f|
    f.puts "EVENT: #{event_name}"
    f.puts "SLUG: #{slug}"
    f.puts "ASJJF_IDS: #{asjjf_ids.join(', ')}"
    f.puts ""
    
    current_div = nil
    all_results.each do |r|
      if r[:division] != current_div
        f.puts "" if current_div # blank line between divisions
        f.puts "##### #{r[:division]}"
        current_div = r[:division]
      end
      f.puts "#{r[:placement]}|#{r[:name]}|#{r[:academy]}|#{r[:country]}"
    end
  end
  
  puts "Wrote #{all_results.length} results to event_results_#{slug}.txt"
end

puts "\nDone!"
