namespace :asjjf do
  desc "Import results from ASJJF for all events that have asjjf_event_ids configured"
  task import_all: :environment do
    events = Event.where("asjjf_event_ids IS NOT NULL AND asjjf_event_ids != '[]'")
                  .order(date: :desc)
    total = events.count

    if total.zero?
      puts "No events with ASJJF event IDs found."
      exit 0
    end

    puts "Found #{total} events with ASJJF IDs.\n\n"

    imported = 0
    skipped = 0
    failed = 0

    events.each_with_index do |event, idx|
      ids = event.asjjf_event_ids
      prefix = "[#{idx + 1}/#{total}]"

      print "#{prefix} #{event.name} (IDs: #{ids.join(', ')})... "

      begin
        result = AsjjfScraper.import!(event: event, asjjf_event_ids: ids)
        puts "#{result[:imported]} results (#{result[:summary][:by_gender].map { |g, c| "#{c} #{g}" }.join(', ')})"
        imported += 1
      rescue AsjjfScraper::ScraperError => e
        puts "SKIPPED — #{e.message}"
        skipped += 1
      rescue => e
        puts "FAILED — #{e.message}"
        failed += 1
      end
    end

    puts "\nDone! Imported: #{imported}, Skipped: #{skipped}, Failed: #{failed}"
  end

  desc "Preview results from ASJJF for all events (dry run, no database changes)"
  task preview_all: :environment do
    events = Event.where("asjjf_event_ids IS NOT NULL AND asjjf_event_ids != '[]'")
                  .order(date: :desc)
    total = events.count

    if total.zero?
      puts "No events with ASJJF event IDs found."
      exit 0
    end

    puts "Previewing #{total} events...\n\n"

    events.each_with_index do |event, idx|
      ids = event.asjjf_event_ids
      prefix = "[#{idx + 1}/#{total}]"

      print "#{prefix} #{event.name} (IDs: #{ids.join(', ')})... "

      begin
        result = AsjjfScraper.preview(asjjf_event_ids: ids)
        summary = result[:summary]
        puts "#{summary[:total]} results — #{summary[:by_gender].map { |g, c| "#{c} #{g}" }.join(', ')} — #{summary[:academies]} academies, #{summary[:countries]} countries"
      rescue => e
        puts "ERROR — #{e.message}"
      end
    end
  end

  desc "Import results from ASJJF for a single event by slug"
  task :import, [:slug] => :environment do |_t, args|
    slug = args[:slug]
    unless slug
      puts "Usage: rake asjjf:import[event-slug]"
      exit 1
    end

    event = Event.find_by(slug: slug)
    unless event
      puts "Event not found: #{slug}"
      exit 1
    end

    ids = event.asjjf_event_ids
    if ids.blank?
      puts "No ASJJF event IDs configured for #{event.name}"
      exit 1
    end

    puts "Importing #{event.name} (IDs: #{ids.join(', ')})..."
    result = AsjjfScraper.import!(event: event, asjjf_event_ids: ids)
    puts "Imported #{result[:imported]} results"
    puts "By gender: #{result[:summary][:by_gender].inspect}"
    puts "By belt: #{result[:summary][:by_belt].inspect}"
    puts "Academies: #{result[:summary][:academies]}, Countries: #{result[:summary][:countries]}"
  end
end
