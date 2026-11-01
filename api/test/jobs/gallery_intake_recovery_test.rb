require "test_helper"
require_relative "../support/photo_intake_fixtures"

class GalleryIntakeRecoveryTest < ActiveSupport::TestCase
  include PhotoIntakeFixtures
  include ActiveJob::TestHelper

  test "sweeper recovers stale queued and processing imports without reviving terminal work" do
    event = Organization.create!(name: "Recover", slug: "recover").events.create!(name: "Recover", slug: "recover")
    queued = create_import(event, files: [])
    processing = create_import(event, files: [], status: "processing")
    completed = create_import(event, files: [], status: "completed")
    [ queued, processing, completed ].each { |import| import.update_columns(updated_at: 1.hour.ago) }
    create_import(event, files: [])
    assert_enqueued_jobs 2, only: ImportEventGalleryArchiveJob do
      RequeueStaleGalleryImportsJob.perform_now
    end
    assert_equal "completed", completed.reload.status
  end
end
