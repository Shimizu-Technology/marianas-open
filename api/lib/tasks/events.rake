namespace :events do
  desc "Mark Marianas Pro Nagoya 2026 as completed and set ASJJF event IDs for results import"
  task mark_nagoya_2026_completed: :environment do
    slug = "marianas-pro-nagoya-2026"
    event = Event.find_by(slug: slug)

    if event.nil?
      puts "ERROR: Event '#{slug}' not found in database."
      exit 1
    end

    puts "Found: #{event.name} (current status: #{event.status})"

    # ASJJF event ID 1863 from registration URL:
    # https://asjjf.org/main/eventInfo/1863
    asjjf_ids = [1863]

    event.update!(
      status: "completed",
      asjjf_event_ids: asjjf_ids
    )

    puts "Updated '#{event.name}':"
    puts "  status: #{event.status}"
    puts "  asjjf_event_ids: #{event.asjjf_event_ids.inspect}"
    puts ""
    puts "To import results, run in admin UI or via API:"
    puts "  POST /api/v1/admin/events/#{event.id}/import_results"
    puts "  (requires admin authentication)"
  end

  desc "Mark any past events (date < today) still listed as 'upcoming' as 'completed'"
  task auto_complete_past: :environment do
    past_upcoming = Event.where(status: "upcoming").where("date < ?", Date.current)
    if past_upcoming.empty?
      puts "No past events still marked as upcoming."
    else
      past_upcoming.each do |event|
        event.update!(status: "completed")
        puts "Marked completed: #{event.name} (#{event.date})"
      end
      puts "Done. #{past_upcoming.count} event(s) updated."
    end
  end
end
