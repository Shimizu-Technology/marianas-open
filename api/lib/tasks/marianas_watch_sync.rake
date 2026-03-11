namespace :marianas do
  desc 'Sync watch videos from CSV (idempotent). Usage: rake marianas:sync_watch_videos CSV=path/to/watch_videos.csv DRY_RUN=true'
  task sync_watch_videos: :environment do
    require 'csv'

    csv_path = ENV['CSV'] || Rails.root.join('db/seeds/marianas/watch_videos.csv').to_s
    dry_run = ActiveModel::Type::Boolean.new.cast(ENV['DRY_RUN'])

    unless File.exist?(csv_path)
      abort "CSV not found: #{csv_path}"
    end

    puts "[marianas:sync_watch_videos] csv=#{csv_path} dry_run=#{dry_run}"

    created = 0
    updated = 0
    skipped = 0

    CSV.foreach(csv_path, headers: true) do |row|
      title = row['title'].to_s.strip
      youtube_url = row['youtube_url'].to_s.strip
      category = row['category'].to_s.strip.presence || 'gi'
      featured = row['featured'].to_s.strip.downcase == 'true'
      sort_order = row['sort_order'].to_s.strip.presence&.to_i || 0
      status = row['status'].to_s.strip.presence || 'published'

      if title.blank? || youtube_url.blank?
        skipped += 1
        puts "- skip row: missing title/youtube_url"
        next
      end

      video = Video.find_or_initialize_by(youtube_url: youtube_url)
      attrs = {
        title: title,
        category: category,
        featured: featured,
        sort_order: sort_order,
        status: status,
      }

      changed = video.new_record? || attrs.any? { |k, v| video.public_send(k) != v }
      if !changed
        skipped += 1
        next
      end

      if dry_run
        puts "- #{video.new_record? ? 'create' : 'update'} #{youtube_url}"
        next
      end

      video.assign_attributes(attrs)
      video.save!
      if video.previous_changes.key?('id')
        created += 1
      else
        updated += 1
      end
    end

    puts "[marianas:sync_watch_videos] created=#{created} updated=#{updated} skipped=#{skipped}"
  end
end
