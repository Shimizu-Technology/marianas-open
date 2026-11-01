require "test_helper"
require_relative "../../support/photo_intake_fixtures"

class PhotoIntakeImporterTest < ActiveSupport::TestCase
  include PhotoIntakeFixtures

  setup do
    @event = Organization.create!(name: "Import", slug: "import").events.create!(name: "Import", slug: "import", date: Date.new(2027, 1, 30))
  end

  test "archive processes streams deduplicates and records progress without filename captions" do
    import = create_import(@event, files: [ { name: "nested/A.JPG", data: image_bytes }, { name: "duplicate.png", data: image_bytes },
      { name: "note.txt", data: "some notes" }, { name: "__MACOSX/._A.JPG", data: "junk" } ])
    PhotoIntake::Importer.new(import).call
    assert_equal "completed", import.reload.status
    assert_equal 4, import.total_entries
    assert_equal 4, import.processed_entries
    assert_equal 1, import.imported_count
    assert_equal 3, import.skipped_count
    assert_equal 2, import.entry_errors.length
    refute import.archive.attached?
    image = @event.event_gallery_images.sole
    assert_equal "A.JPG", image.original_filename
    assert_equal "image/png", image.content_type
    assert_nil image.title
    assert_nil image.caption
    assert_nil image.alt_text
    assert_equal "zip_mtime", image.capture_source
    assert_equal Time.utc(2027, 1, 30, 2), image.captured_at
    assert_includes image.review_flags, "exact_duplicate"
    assert_equal "Podium", image.category
    assert_equal "Podium Day 1", image.proposed_category
    assert_equal 1, @event.event_gallery_albums.count
    PhotoIntake::Importer.new(import).call
    assert_equal 1, @event.event_gallery_images.count
    assert_equal 4, import.reload.processed_entries
  end

  test "retry after interrupted entry resumes ledger without duplicating image or counts" do
    import = create_import(@event, files: [ { name: "one.png", data: image_bytes }, { name: "two.png", data: image_bytes(value: 129) } ])
    klass = PhotoIntake::Importer
    original = klass.instance_method(:ingest)
    calls = 0
    klass.define_method(:ingest) do |*args|
      calls += 1
      raise IOError, "simulated worker/storage crash" if calls == 2
      original.bind_call(self, *args)
    end
    assert_raises(IOError) { klass.new(import).call }
    assert_equal 1, import.reload.processed_entries
    assert_equal 1, @event.event_gallery_images.count
    klass.define_method(:ingest, original)
    klass.new(import).call
    assert_equal "completed", import.reload.status
    assert_equal 2, import.processed_entries
    assert_equal 2, import.imported_count
    assert_equal 2, @event.event_gallery_images.count
  ensure
    klass.define_method(:ingest, original) if original
  end

  test "unsafe archive fails without extracting any photos and purges source" do
    import = create_import(@event, files: [ { name: "safe.png", data: image_bytes }, { name: "../escape.png", data: image_bytes } ])
    PhotoIntake::Importer.new(import).call
    assert_equal "failed", import.reload.status
    assert_empty @event.event_gallery_images
    refute import.archive.attached?
    assert_match "Unsafe archive path", import.entry_errors.first["message"]
  end

  test "disk preflight refuses intake with actionable saved error and cleans archive" do
    import = create_import(@event, files: [ { name: "one.png", data: image_bytes } ])
    original = PhotoIntake::DiskSpace.method(:available_bytes)
    PhotoIntake::DiskSpace.define_singleton_method(:available_bytes) { 0 }
    PhotoIntake::Importer.new(import).call
    assert_equal "failed", import.reload.status
    assert_match "Increase Render worker", import.entry_errors.first["message"]
    assert_empty @event.event_gallery_images
    refute import.archive.attached?
  ensure
    PhotoIntake::DiskSpace.define_singleton_method(:available_bytes, original) if original
  end

  test "ENOSPC during download terminates safely and persists a recovery instruction" do
    import = create_import(@event, files: [ { name: "one.png", data: image_bytes } ])
    original = PhotoIntake::Download.method(:open)
    PhotoIntake::Download.define_singleton_method(:open) { |*| raise Errno::ENOSPC }
    PhotoIntake::Importer.new(import).call
    assert_equal "failed", import.reload.status
    assert_match "increase ephemeral storage", import.entry_errors.first["message"]
    refute import.archive.attached?
  ensure
    PhotoIntake::Download.define_singleton_method(:open, original) if original
  end

  test "mismatched storage bytes never reach archive parser" do
    import = create_import(@event, files: [ { name: "one.png", data: image_bytes } ])
    import.archive.blob.update!(byte_size: 1)
    PhotoIntake::Importer.new(import).call
    assert_equal "failed", import.reload.status
    assert_empty @event.event_gallery_images
    assert_match "declared size", import.entry_errors.first["message"]
  end

  test "dedup still finds a retained duplicate after the earlier photo was deleted" do
    first = attach_image(@event)
    second = attach_image(@event)
    PhotoIntake::Review.call(first)
    PhotoIntake::Review.call(second)
    first.destroy!
    import = create_import(@event, files: [ { name: "duplicate.png", data: image_bytes } ])
    PhotoIntake::Importer.new(import).call
    assert_equal 0, import.reload.imported_count
    assert_equal 1, import.skipped_count
    assert_equal [ second.id ], @event.event_gallery_images.pluck(:id)
  end

  test "custom album type snapshot hold and event isolation are preserved" do
    other = @event.organization.events.create!(name: "Other", slug: "other")
    source = attach_image(other)
    PhotoIntake::Review.call(source)
    import = create_import(@event, files: [ { name: "stage.png", data: image_bytes } ], album_type: "Opening Ceremony", category: "Stage", hold_flagged: true)
    @event.update!(gallery_hold_flagged: false)
    PhotoIntake::Importer.new(import).call
    image = @event.event_gallery_images.sole
    PhotoIntake::Review.call(image)
    refute image.reload.active?
    assert image.review_held?
    assert_equal "Opening Ceremony Day 1", image.proposed_category
    refute_includes source.reload.review_flags, "exact_duplicate"
  end
end
