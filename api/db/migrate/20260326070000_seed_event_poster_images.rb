class SeedEventPosterImages < ActiveRecord::Migration[7.1]
  def up
    poster_map = {
      "marianas-pro-nagoya-2026" => "poster-mp-nagoya.jpg",
      "marianas-pro-korea-2026" => "poster-mp-korea.jpg",
      "copa-de-marianas-2026" => "poster-copa.jpg",
    }

    web_images_dir = Rails.root.join("..", "web", "public", "images")

    poster_map.each do |slug, filename|
      event = Event.find_by(slug: slug)
      next unless event

      file_path = web_images_dir.join(filename)
      next unless File.exist?(file_path)
      next if event.poster_image.attached?

      event.poster_image.attach(
        io: File.open(file_path),
        filename: filename,
        content_type: "image/jpeg"
      )
      puts "  Attached #{filename} to #{event.name}"
    end
  end

  def down
    %w[marianas-pro-nagoya-2026 marianas-pro-korea-2026 copa-de-marianas-2026].each do |slug|
      event = Event.find_by(slug: slug)
      event&.poster_image&.purge if event&.poster_image&.attached?
    end
  end
end
