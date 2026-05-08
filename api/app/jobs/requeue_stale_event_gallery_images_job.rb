class RequeueStaleEventGalleryImagesJob < ApplicationJob
  queue_as :default

  STALE_AFTER = 10.minutes

  def perform
    uploaded_stale = EventGalleryImage.where(status: "uploaded", updated_at: ...STALE_AFTER.ago)
    processing_stale = EventGalleryImage
      .where(status: "processing")
      .where("processing_started_at IS NULL OR processing_started_at < ?", STALE_AFTER.ago)
    scope = uploaded_stale.or(processing_stale).with_attached_image

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
    else
      false
    end
  end
end
