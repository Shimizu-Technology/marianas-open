class ProcessEventGalleryImageJob < ApplicationJob
  queue_as :default

  discard_on ActiveJob::DeserializationError

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
  rescue StandardError, LoadError => e
    gallery_image&.update_columns(status: "failed", processing_error: e.message)
    gallery_image&.event_gallery_upload_batch&.refresh_counts!
    Rails.logger.error("[ProcessEventGalleryImageJob] Failed EventGalleryImage##{event_gallery_image_id}: #{e.class} #{e.message}")
  end
end
