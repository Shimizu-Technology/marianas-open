class RefreshEventGalleryUploadBatchJob < ApplicationJob
  queue_as :default

  discard_on ActiveJob::DeserializationError
  retry_on ActiveRecord::Deadlocked, wait: :polynomially_longer, attempts: 5

  def perform(event_gallery_upload_batch_id)
    EventGalleryUploadBatch.find_by(id: event_gallery_upload_batch_id)&.refresh_counts!
  end
end
