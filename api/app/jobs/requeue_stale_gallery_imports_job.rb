class RequeueStaleGalleryImportsJob < ApplicationJob
  queue_as :default

  def perform
    EventGalleryImport.where(status: %w[queued processing]).where(updated_at: ...30.minutes.ago).find_each do |import|
      ImportEventGalleryArchiveJob.perform_later(import.id)
    end
  end
end
