class PurgeUnattachedBlobsJob < ApplicationJob
  queue_as :default

  def perform
    # Direct uploads need time to finish and attach. Recheck attachment state
    # at purge time; Active Storage also protects attached blobs with an FK.
    ActiveStorage::Blob.unattached.where(created_at: ...2.days.ago).find_each do |blob|
      blob.purge if blob.attachments.none?
    end
  end
end
