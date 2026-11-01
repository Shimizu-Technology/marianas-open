module PhotoIntake
  class Review
    def self.add_flag!(image, flag, hold:)
      image.with_lock do
        flags = (image.review_flags + [ flag ]).uniq.sort
        should_hold = hold && image.reviewed_at.nil? && image.active?
        return if flags == image.review_flags && !should_hold
        attrs = { review_flags: flags, updated_at: Time.current }
        if should_hold
          attrs.merge!(active: false, review_held: true)
        end
        image.update_columns(attrs)
      end
    end

    def self.apply!(image, inspection, result, hold:, expected_blob_id: nil)
      image.with_lock do
        return if expected_blob_id && image.image.blob.id != expected_blob_id
        flags = result[:flags]
        exact = image.event.event_gallery_images.where(content_sha256: inspection.sha256).where.not(id: image.id).first
        if exact
          flags << "exact_duplicate"
          add_flag!(exact, "exact_duplicate", hold: hold)
        end
        # Compare bounded 64-bit hashes in PostgreSQL, without materializing
        # every event photo per entry or rewriting already flagged peers.
        binary_hash = result[:perceptual_hash].to_i(16).to_s(2).rjust(64, "0")
        peers = image.event.event_gallery_images.where.not(perceptual_hash: nil).where.not(id: image.id)
          .where("length(replace(((('x' || perceptual_hash)::bit(64)) # (?::bit(64)))::text, '0', '')) <= 5", binary_hash)
        peers = peers.where.not(id: exact.id) if exact
        if peers.exists?
          flags << "near_duplicate"
          condition = "NOT (review_flags @> '[\"near_duplicate\"]'::jsonb)"
          condition += " OR (reviewed_at IS NULL AND active = TRUE)" if hold
          peers.where(condition).find_each { |peer| add_flag!(peer, "near_duplicate", hold: hold) }
        end
        captured, source = CaptureTime.from_image(inspection.image, timezone: image.capture_timezone.presence || image.event.gallery_timezone)
        attrs = {
          review_flags: (image.review_flags + flags).uniq.sort,
          perceptual_hash: result[:perceptual_hash],
          content_sha256: inspection.sha256,
          review_analyzed_at: Time.current,
          updated_at: Time.current
        }
        if image.captured_at.nil? && image.capture_source.nil?
          attrs.merge!(captured_at: captured, capture_source: source, capture_timezone: image.capture_timezone.presence || image.event.gallery_timezone)
        end
        if hold && attrs[:review_flags].any? && image.reviewed_at.nil? && image.active?
          attrs.merge!(active: false, review_held: true)
        end
        image.update_columns(attrs)
      end
    end

    def self.call(image)
      EventLock.with(image.event_id) do
        image.reload
        return if image.review_analyzed_at
        blob = image.image.blob
        Download.open(blob, maximum: EventGalleryImage::MAX_BYTE_SIZE) do |file|
          inspection = ImageInspection.new(file.path)
          result = inspection.review # Decode fully before persisting any success.
          hold = image.event_gallery_import ? image.event_gallery_import.hold_flagged : image.event.gallery_hold_flagged
          apply!(image, inspection, result, hold: hold, expected_blob_id: blob.id)
        end
      end
    end
  end
end
