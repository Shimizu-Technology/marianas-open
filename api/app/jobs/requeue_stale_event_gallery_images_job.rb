class RequeueStaleEventGalleryImagesJob < ApplicationJob
  queue_as :default

  STALE_AFTER = 10.minutes
  RETRYABLE_FAILURE_MESSAGES = [
    "cached plan must not change result type",
    "Image attachment was not ready for processing",
    "The provided transformation method is not supported: saver."
  ].freeze

  def perform
    uploaded_stale = EventGalleryImage.where(status: "uploaded", updated_at: ...STALE_AFTER.ago)
    processing_stale = EventGalleryImage
      .where(status: "processing")
      .where("processing_started_at IS NULL OR processing_started_at < ?", STALE_AFTER.ago)
    failed_retryable = EventGalleryImage
      .where(status: "failed")
      .where(updated_at: ...STALE_AFTER.ago)
      .where(retryable_failure_clause)
    scope = uploaded_stale.or(processing_stale).or(failed_retryable).with_attached_image

    scope.find_each do |gallery_image|
      next unless gallery_image.image.attached?

      gallery_image.with_lock do
        gallery_image.reload
        next unless stale?(gallery_image)
        next unless gallery_image.image.attached?

        gallery_image.update_columns(
          status: "uploaded",
          processing_error: nil,
          processing_token: nil,
          processing_started_at: nil,
          updated_at: Time.current
        )
        ProcessEventGalleryImageJob.perform_later(gallery_image.id)
      end
    end
  end

  private

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
end
