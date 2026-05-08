class ProcessEventGalleryImageJob < ApplicationJob
  queue_as :default

  discard_on ActiveJob::DeserializationError
  retry_on StandardError, LoadError, wait: :polynomially_longer, attempts: 3 do |job, error|
    job.mark_failed(error)
  end

  def perform(event_gallery_image_id)
    gallery_image = EventGalleryImage.find_by(id: event_gallery_image_id)
    return unless gallery_image&.image&.attached?

    unless gallery_image.status == "processing"
      gallery_image.update_columns(status: "processing", updated_at: Time.current)
    end

    blob = gallery_image.image.blob
    blob.analyze unless blob.analyzed?

    gallery_image.image.variant(EventGalleryImage::THUMBNAIL_TRANSFORMATIONS).processed
    gallery_image.image.variant(EventGalleryImage::LARGE_TRANSFORMATIONS).processed

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
    refresh_batch_counts(gallery_image)
  end

  def mark_failed(error)
    gallery_image = EventGalleryImage.find_by(id: arguments.first)
    gallery_image&.update_columns(status: "failed", processing_error: error.message, updated_at: Time.current)
    refresh_batch_counts(gallery_image)
    Rails.logger.error("[ProcessEventGalleryImageJob] Failed EventGalleryImage##{arguments.first}: #{error.class} #{error.message}")
  end

  private

  def refresh_batch_counts(gallery_image)
    return unless gallery_image&.event_gallery_upload_batch_id

    RefreshEventGalleryUploadBatchJob.perform_later(gallery_image.event_gallery_upload_batch_id)
  end
end
