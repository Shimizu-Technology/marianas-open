class RequeueStaleEventGalleryImagesJob < ApplicationJob
  queue_as :default

  STALE_AFTER = 10.minutes

  def perform
    scope = EventGalleryImage
      .where(status: %w[uploaded processing])
      .where(updated_at: ...STALE_AFTER.ago)
      .with_attached_image

    scope.find_each do |gallery_image|
      next unless gallery_image.image.attached?

      gallery_image.update_columns(
        status: "uploaded",
        processing_error: nil,
        updated_at: Time.current
      )
      ProcessEventGalleryImageJob.perform_later(gallery_image.id)
    end
  end
end
