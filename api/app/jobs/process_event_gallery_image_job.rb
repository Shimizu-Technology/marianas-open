class ProcessEventGalleryImageJob < ApplicationJob
  queue_as :default

  discard_on ActiveJob::DeserializationError
  retry_on StandardError, LoadError, wait: :polynomially_longer, attempts: 3 do |job, error|
    job.mark_failed(error)
  end

  def perform(event_gallery_image_id)
    gallery_image = EventGalleryImage.find_by(id: event_gallery_image_id)
    return unless gallery_image&.image&.attached?

    gallery_image.update_column(:status, "processing") unless gallery_image.status == "processing"

    blob = gallery_image.image.blob
    blob.analyze unless blob.analyzed?

    gallery_image.image.variant(resize_to_fill: [600, 400]).processed
    gallery_image.image.variant(resize_to_limit: [1800, 1800]).processed

    metadata = blob.reload.metadata || {}
    gallery_image.update_columns(
      status: "ready",
      width: metadata["width"],
      height: metadata["height"],
      content_type: blob.content_type,
      byte_size: blob.byte_size,
      processed_at: Time.current,
      processing_error: nil
    )
    gallery_image.event_gallery_upload_batch&.refresh_counts!
  end

  def mark_failed(error)
    gallery_image = EventGalleryImage.find_by(id: arguments.first)
    gallery_image&.update_columns(status: "failed", processing_error: error.message)
    gallery_image&.event_gallery_upload_batch&.refresh_counts!
    Rails.logger.error("[ProcessEventGalleryImageJob] Failed EventGalleryImage##{arguments.first}: #{error.class} #{error.message}")
  end
end
