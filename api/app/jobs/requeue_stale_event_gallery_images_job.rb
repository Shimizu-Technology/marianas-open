class RequeueStaleEventGalleryImagesJob < ApplicationJob
  queue_as :default

  STALE_AFTER = 10.minutes
  MAX_FAILED_REQUEUE_ATTEMPTS = 3
  MAX_READY_VARIANT_REPAIR_ATTEMPTS = 3
  READY_VARIANT_REPAIR_BATCH_SIZE = ENV.fetch("EVENT_GALLERY_VARIANT_REPAIR_BATCH_SIZE", 200).to_i
  RETRYABLE_FAILURE_MESSAGES = [
    "cached plan must not change result type",
    "Image attachment was not ready for processing",
    "The provided transformation method is not supported: saver.",
    "VipsOperation: class \"quality\" not found"
  ].freeze

  def perform
    uploaded_stale = EventGalleryImage.where(status: "uploaded", updated_at: (...STALE_AFTER.ago))
    processing_stale = EventGalleryImage
      .where(status: "processing")
      .where("processing_started_at IS NULL OR processing_started_at < ?", STALE_AFTER.ago)
    failed_retryable = EventGalleryImage
      .where(status: "failed")
      .where(updated_at: (...STALE_AFTER.ago))
      .where("processing_requeue_count < ?", MAX_FAILED_REQUEUE_ATTEMPTS)
      .where(retryable_failure_clause)
    uploaded_stale.or(processing_stale).or(failed_retryable).with_attached_image.find_each do |gallery_image|
      next unless gallery_image.image.attached?

      gallery_image.with_lock do
        gallery_image.reload
        next unless stale?(gallery_image)
        next unless gallery_image.image.attached?

        gallery_image.update_columns(
          status: "uploaded",
          processing_requeue_count: next_requeue_count(gallery_image),
          processing_error: nil,
          processing_token: nil,
          processing_started_at: nil,
          updated_at: Time.current
        )
        ProcessEventGalleryImageJob.perform_later(gallery_image.id)
      end
    end

    repair_ready_images_missing_vips_variants
  end

  private

  def repair_ready_images_missing_vips_variants
    EventGalleryImage
      .ready
      .where(vips_variants_repaired_at: nil)
      .where("vips_variant_repair_attempts <= ?", MAX_READY_VARIANT_REPAIR_ATTEMPTS)
      .with_image_variant_records
      .limit(READY_VARIANT_REPAIR_BATCH_SIZE)
      .each do |gallery_image|
      next unless gallery_image.image.attached?

      gallery_image.with_lock do
        gallery_image.reload
        next unless gallery_image.status == "ready"
        next unless gallery_image.image.attached?

        if gallery_image.variants_processed?
          gallery_image.update_columns(vips_variants_repaired_at: Time.current)
          next
        end

        if gallery_image.vips_variant_repair_attempts.to_i >= MAX_READY_VARIANT_REPAIR_ATTEMPTS
          gallery_image.update_columns(
            status: "failed",
            processing_error: "Current vips variants could not be repaired after #{MAX_READY_VARIANT_REPAIR_ATTEMPTS} attempts",
            processing_token: nil,
            processing_started_at: nil,
            vips_variants_repaired_at: Time.current,
            updated_at: Time.current
          )
          next
        end

        gallery_image.update_columns(
          status: "uploaded",
          vips_variant_repair_attempts: gallery_image.vips_variant_repair_attempts.to_i + 1,
          processing_error: nil,
          processing_token: nil,
          processing_started_at: nil,
          updated_at: Time.current
        )
        ProcessEventGalleryImageJob.perform_later(gallery_image.id)
      end
    end
  end

  def stale?(gallery_image)
    case gallery_image.status
    when "uploaded"
      gallery_image.updated_at < STALE_AFTER.ago
    when "processing"
      gallery_image.processing_started_at.nil? || gallery_image.processing_started_at < STALE_AFTER.ago
    when "failed"
      gallery_image.updated_at < STALE_AFTER.ago && retryable_failure?(gallery_image.processing_error)
    else
      false
    end
  end

  def retryable_failure_clause
    RETRYABLE_FAILURE_MESSAGES
      .map { ActiveRecord::Base.sanitize_sql_array([ "processing_error LIKE ?", "%#{_1}%" ]) }
      .join(" OR ")
  end

  def retryable_failure?(message)
    RETRYABLE_FAILURE_MESSAGES.any? { |retryable_message| message.to_s.include?(retryable_message) }
  end

  def next_requeue_count(gallery_image)
    return gallery_image.processing_requeue_count unless gallery_image.status == "failed"

    gallery_image.processing_requeue_count + 1
  end
end
