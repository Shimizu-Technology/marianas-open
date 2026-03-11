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
    tx_created = 0
    tx_updated = 0

    runner = proc do
      CSV.foreach(csv_path, headers: true).with_index(2) do |row, line_no|
        title = row['title'].to_s.strip
        youtube_url = row['youtube_url'].to_s.strip
        if title.blank? || youtube_url.blank?
          skipped += 1
          puts "- skip row #{line_no}: missing title/youtube_url (title=#{title.inspect} url=#{youtube_url.inspect})"
          next
        end

        category = row['category'].to_s.strip.presence || 'gi'
        unless %w[gi no-gi].include?(category)
          skipped += 1
          puts "- skip row #{line_no}: unknown category=#{category.inspect} (allowed: gi, no-gi)"
          next
        end

        featured_cast = ActiveModel::Type::Boolean.new.cast(row['featured'])
        featured = featured_cast.nil? ? false : featured_cast
        sort_order_raw = row['sort_order'].to_s.strip
        sort_order = if sort_order_raw.blank?
                       0
                     elsif sort_order_raw.match?(/\A\d+\z/)
                       sort_order_raw.to_i
                     else
                       skipped += 1
                       puts "- skip row #{line_no}: invalid sort_order=#{sort_order_raw.inspect} (must be numeric)"
                       next
                     end
        status = row['status'].to_s.strip.presence || 'published'
        unless %w[published draft archived].include?(status)
          skipped += 1
          puts "- skip row #{line_no}: unknown status=#{status.inspect} (allowed: published, draft, archived)"
          next
        end

        event_slug = row['event_slug'].to_s.strip
        event_name = row['event_name'].to_s.strip
        event = nil
        if event_slug.present?
          event = Event.find_by(slug: event_slug)
          if event.nil?
            skipped += 1
            puts "- skip row #{line_no}: unknown event_slug=#{event_slug.inspect}"
            next
          end
        elsif event_name.present?
          matches = Event.where(name: event_name).limit(2).to_a
          if matches.empty?
            skipped += 1
            puts "- skip row #{line_no}: unknown event_name=#{event_name.inspect}"
            next
          elsif matches.length > 1
            skipped += 1
            puts "- skip row #{line_no}: ambiguous event_name=#{event_name.inspect}; use event_slug instead"
            next
          else
            event = matches.first
          end
        end

        youtube_video_id = Video.parse_youtube_video_id(youtube_url)
        if youtube_video_id.blank?
          skipped += 1
          puts "- skip row #{line_no}: could not extract youtube_video_id from #{youtube_url.inspect}"
          next
        end

        video = Video.find_by(youtube_video_id: youtube_video_id) || Video.find_or_initialize_by(youtube_url: youtube_url)
        if !video.new_record? && video.youtube_url.present? && video.youtube_url != youtube_url
          puts "- warn row #{line_no}: youtube_url differs for #{youtube_video_id} (db=#{video.youtube_url.inspect} csv=#{youtube_url.inspect})"
        end

        attrs = {
          title: title,
          youtube_url: youtube_url,
          youtube_video_id: youtube_video_id,
          category: category,
          featured: featured,
          sort_order: sort_order,
          status: status,
        }
        attrs[:event_id] = event.id if event_slug.present? || event_name.present?

        changed = video.new_record? || attrs.any? { |k, v| video.public_send(k) != v }
        if !changed
          skipped += 1
          next
        end

        action = video.new_record? ? 'create' : 'update'
        if dry_run
          puts "- [dry_run] #{action} #{youtube_url}"
          created += 1 if action == 'create'
          updated += 1 if action == 'update'
          next
        end

        video.assign_attributes(attrs)
        video.save!
        if video.previous_changes.key?('id')
          tx_created += 1
          puts "- create #{youtube_url}"
        else
          tx_updated += 1
          puts "- update #{youtube_url}"
        end
      end
    end

    if dry_run
      runner.call
    else
      ActiveRecord::Base.transaction do
        runner.call
      end
      created = tx_created
      updated = tx_updated
    end

    puts "[marianas:sync_watch_videos] created=#{created} updated=#{updated} skipped=#{skipped}"
  end
end
