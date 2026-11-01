module PhotoIntake
  class Importer
    def initialize(import)
      @import = import
    end

    def call
      EventLock.with(@import.event_id) do
        @import.reload
        if @import.terminal?
          purge_archive
          return
        end
        @import.update!(status: "processing")
        DiskSpace.ensure_archive!(@import.archive.blob.byte_size)
        Download.open(@import.archive.blob, maximum: Archive::MAX_BYTES) do |file|
          archive = Archive.new(file.path)
          @import.update!(total_entries: archive.entries.length)
          archive.entries.each_with_index do |entry, index|
            next if @import.event_gallery_import_entries.exists?(entry_index: index)
            if entry.directory?
              record_entry(index, "ignored")
              next
            elsif metadata?(entry.name)
              record_entry(index, "skipped", error: { entry: entry.name.to_s.first(200), message: "Skipped system metadata file" })
              next
            end
            Tempfile.create([ "photo-entry-", File.extname(entry.name).first(12) ], binmode: true) do |output|
              archive.extract(entry, output)
              ingest(output, entry, index)
            end
          end
        end
        @import.update!(status: "completed", completed_at: Time.current)
        purge_archive
      end
    rescue Archive::Unsafe, Errno::ENOSPC => error
      @import.reload.update!(status: "failed", completed_at: Time.current,
        entry_errors: (@import.entry_errors + [ { entry: nil, message: (error.is_a?(Errno::ENOSPC) ? "Worker temporary disk filled during intake; increase ephemeral storage or use a smaller ZIP" : error.message).to_s.first(300) } ]).last(100))
      purge_archive
    end

    private

    def metadata?(name)
      name.split("/").any? { |part| part == "__MACOSX" || part.start_with?("._") || part == ".DS_Store" }
    end

    def ingest(file, entry, index)
      inspection = ImageInspection.new(file.path)
      review = inspection.review # Decode once here; the image worker reuses the saved analysis.
      duplicate = @import.event.event_gallery_images.find_by(content_sha256: inspection.sha256)
      if duplicate
        Review.add_flag!(duplicate, "exact_duplicate", hold: @import.hold_flagged)
        record_entry(index, "skipped", image: duplicate)
        return
      end
      captured, source = CaptureTime.from_image(inspection.image, timezone: @import.timezone, zip_time: entry.time)
      blob = ActiveStorage::Blob.create_and_upload!(io: file, filename: File.basename(entry.name), content_type: inspection.content_type, identify: false)
      begin
        EventGalleryImage.transaction do
          image = @import.event.event_gallery_images.build(
            event_gallery_import: @import, category: @import.category, proposal_base_category: @import.category,
            album_type: @import.album_type, capture_timezone: @import.timezone,
            captured_at: captured, capture_source: source, content_sha256: inspection.sha256,
            status: "uploaded", original_filename: File.basename(entry.name),
            content_type: inspection.content_type, byte_size: blob.byte_size,
            sort_order: @import.event.event_gallery_images.maximum(:sort_order).to_i + 1
          )
          image.image.attach(blob)
          image.save!
          Review.apply!(image, inspection, review, hold: @import.hold_flagged)
          record_entry(index, "imported", image: image)
        end
      rescue StandardError
        blob.purge if blob.attachments.none?
        raise
      end
    rescue ImageInspection::Invalid => error
      record_entry(index, "skipped", error: { entry: entry.name.to_s.first(200), message: error.message.to_s.first(300) })
    end

    def record_entry(index, outcome, image: nil, error: nil)
      @import.with_lock do
        @import.event_gallery_import_entries.create!(entry_index: index, outcome: outcome, event_gallery_image: image)
        attrs = { processed_entries: @import.processed_entries + 1 }
        attrs[:imported_count] = @import.imported_count + 1 if outcome == "imported"
        attrs[:skipped_count] = @import.skipped_count + 1 if outcome == "skipped"
        attrs[:entry_errors] = (@import.entry_errors + [ error ]).last(100) if error
        @import.update!(attrs)
      end
    end

    def purge_archive
      @import.archive.purge if @import.archive.attached?
    end
  end
end
