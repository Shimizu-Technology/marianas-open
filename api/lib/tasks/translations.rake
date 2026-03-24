namespace :translations do
  desc "Translate all existing events and their child records (one-time backfill)"
  task backfill: :environment do
    service = GtTranslationService.new
    unless service.configured?
      puts "GT API not configured. Set GT_API_KEY and GT_PROJECT_ID in your .env"
      exit 1
    end

    events = Event.where(translation_status: ["untranslated", "failed"])
    total = events.count
    puts "Found #{total} events to translate...\n\n"

    events.find_each.with_index do |event, idx|
      print "[#{idx + 1}/#{total}] #{event.name}... "
      begin
        TranslateRecordJob.perform_now(event.class.name, event.id)
        event.reload
        puts event.translation_status

        schedule_items = event.event_schedule_items.where(translation_status: ["untranslated", "failed"])
        schedule_items.find_each do |item|
          TranslateRecordJob.perform_now(item.class.name, item.id)
        end
        puts "    └─ #{schedule_items.count} schedule items translated" if schedule_items.count > 0

        prizes = event.prize_categories.where(translation_status: ["untranslated", "failed"])
        prizes.find_each do |cat|
          TranslateRecordJob.perform_now(cat.class.name, cat.id)
        end
        puts "    └─ #{prizes.count} prize categories translated" if prizes.count > 0

        accommodations = event.event_accommodations.where(translation_status: ["untranslated", "failed"])
        accommodations.find_each do |acc|
          TranslateRecordJob.perform_now(acc.class.name, acc.id)
        end
        puts "    └─ #{accommodations.count} accommodations translated" if accommodations.count > 0
      rescue => e
        puts "FAILED: #{e.message}"
      end
      puts ""
    end

    puts "Done! Translated #{total} events."
  end

  desc "Show translation status for all events"
  task status: :environment do
    Event.order(:date).each do |event|
      status = event.translation_status.ljust(14)
      langs = event.translations.values.flat_map(&:keys).uniq.sort
      puts "#{status} #{event.name.ljust(45)} #{langs.any? ? langs.join(', ') : '(none)'}"
    end
  end
end
