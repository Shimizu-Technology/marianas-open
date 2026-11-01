require "test_helper"
require "stringio"

class PurgeUnattachedBlobsJobTest < ActiveJob::TestCase
  def blob(created_at:)
    blob = ActiveStorage::Blob.create_and_upload!(io: StringIO.new("test"), filename: "test.txt", content_type: "text/plain")
    blob.update!(created_at: created_at)
    blob
  end

  test "purges abandoned uploads while retaining recent and attached blobs" do
    abandoned = blob(created_at: 3.days.ago)
    recent = blob(created_at: 1.day.ago)
    boundary = blob(created_at: 2.days.ago)
    attached = blob(created_at: 3.days.ago)
    organization = Organization.create!(name: "Test", slug: "test")
    ActiveStorage::Attachment.create!(name: "logo", record: organization, blob: attached)
    # Freeze the cutoff so exactly two days old is retained.
    travel_to boundary.created_at + 2.days do
      PurgeUnattachedBlobsJob.perform_now
    end
    assert_not ActiveStorage::Blob.exists?(abandoned.id)
    assert ActiveStorage::Blob.exists?(recent.id)
    assert ActiveStorage::Blob.exists?(boundary.id)
    assert ActiveStorage::Blob.exists?(attached.id)
    assert_not abandoned.service.exist?(abandoned.key)
  ensure
    ActiveStorage::Attachment.where(blob: attached).delete_all if attached
    [ recent, boundary, attached ].compact.each(&:purge)
  end

  test "recurring maintenance is scheduled alongside existing tasks" do
    config = YAML.load_file(Rails.root.join("config/recurring.yml"))
    assert_equal "PurgeUnattachedBlobsJob", config.dig("purge_unattached_blobs", "class")
    assert_match "Sunday", config.dig("purge_unattached_blobs", "schedule")
    assert_match "clear_finished_in_batches", config.dig("clear_solid_queue_finished_jobs", "command")
    assert config.key?("requeue_stale_event_gallery_images")
    assert config.key?("complete_past_events")
  end
end
