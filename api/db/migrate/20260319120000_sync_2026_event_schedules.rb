class Sync2026EventSchedules < ActiveRecord::Migration[8.1]
  def up
    schedules.each do |slug, schedule_items|
      event = Event.find_by(slug: slug)
      next unless event

      event.event_schedule_items.destroy_all
      schedule_items.each do |item|
        event.event_schedule_items.create!(item)
      end
    end
  end

  def down
    schedules.keys.each do |slug|
      Event.find_by(slug: slug)&.event_schedule_items&.destroy_all
    end
  end

  private

  def schedules
    {
      "marianas-pro-nagoya-2026" => [
        { time: "8:00 AM", description: "Doors Open", sort_order: 1 },
        { time: "9:00 AM", description: "Official Weigh-ins", sort_order: 2 },
        { time: "10:00 AM", description: "First matches begin. Kids: white, grey, yellow, orange, green; Juvenile: white, blue, purple; Adult: white, blue, purple, brown, black; Master: white, blue, purple, brown, black.", sort_order: 3 },
      ],
      "marianas-pro-manila-2026" => [
        { time: "April 25 (Saturday)", description: "All Gi Juvenile, Adult, and Masters divisions.", sort_order: 1 },
        { time: "April 26 (Sunday)", description: "All Kids divisions.", sort_order: 2 },
      ],
      "marianas-pro-taiwan-2026" => [
        { time: "May 30 (Saturday)", description: "All Gi Juvenile, Adult, and Masters divisions.", sort_order: 1 },
        { time: "May 31 (Sunday)", description: "All Kids divisions.", sort_order: 2 },
      ],
      "marianas-pro-korea-2026" => [
        { time: "June 6 (Saturday)", description: "Kids: white, grey, yellow, orange, green; Juvenile: white, blue, purple; Adult: white, blue, purple, brown, black; Master: white, blue, purple, brown, black.", sort_order: 1 },
      ],
      "marianas-pro-hong-kong-2026" => [
        { time: "July 18 (Saturday)", description: "Kids: white, grey, yellow, orange, green; Juvenile: white, blue, purple; Adult: white, blue, purple, brown, black; Master: white, blue, purple, brown, black.", sort_order: 1 },
        { time: "July 19 (Sunday)", description: "Kids: white, grey, yellow, orange, green; Juvenile: white, blue, purple; Adult: white, blue, purple, brown, black; Master: white, blue, purple, brown, black.", sort_order: 2 },
      ],
    }
  end
end
