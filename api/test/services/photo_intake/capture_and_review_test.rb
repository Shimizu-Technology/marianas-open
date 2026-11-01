require "test_helper"
require_relative "../../support/photo_intake_fixtures"

class PhotoIntakeCaptureAndReviewTest < ActiveSupport::TestCase
  include PhotoIntakeFixtures

  setup do
    @event = Organization.create!(name: "Photo", slug: "photo").events.create!(name: "Photo", slug: "photo", date: Date.new(2027, 1, 30), end_date: Date.new(2027, 1, 31))
  end

  test "naive timestamps use chosen IANA zone and strict DST/calendar semantics" do
    assert_equal Time.utc(2027, 1, 29, 14, 30), PhotoIntake::CaptureTime.parse("2027:01:30 00:30:00", "Pacific/Guam")
    assert_equal Time.utc(2027, 1, 30, 5, 30), PhotoIntake::CaptureTime.parse("2027:01:30 00:30:00", "America/New_York")
    [ "2026:03:08 02:30:00", "2026:11:01 01:30:00", "2027:02:30 12:00:00", "2027:01:30 24:00:00" ].each do |value|
      assert_nil PhotoIntake::CaptureTime.parse(value, "America/New_York")
    end
    assert_raises(ArgumentError) { PhotoIntake::CaptureTime.zone("not/a-zone") }
  end

  test "EXIF original and offset take precedence with zip mtime the only fallback" do
    Tempfile.create([ "exif", ".jpg" ], binmode: true) do |file|
      file.write(image_bytes(exif: "2027:01:30 00:15:00", offset: "+09:00", format: ".jpg"))
      file.flush
      inspection = PhotoIntake::ImageInspection.new(file.path)
      captured, source = PhotoIntake::CaptureTime.from_image(inspection.image, timezone: "Pacific/Guam", zip_time: Time.utc(2020))
      assert_equal Time.utc(2027, 1, 29, 15, 15), captured
      assert_equal "exif", source
    end
    image = Vips::Image.black(20, 20)
    captured, source = PhotoIntake::CaptureTime.from_image(image, timezone: "Pacific/Guam", zip_time: Time.utc(2027, 1, 31, 0, 30))
    assert_equal Time.utc(2027, 1, 30, 14, 30), captured
    assert_equal "zip_mtime", source
    assert_equal [ nil, nil ], PhotoIntake::CaptureTime.from_image(image, timezone: "Pacific/Guam")
  end

  test "quality flags and near hash distances are deterministic" do
    assert_equal %w[low_sharpness dark], PhotoIntake::ImageInspection.flags_for(Array.new(25, 0), 5, 5)
    assert_equal %w[low_sharpness overexposed], PhotoIntake::ImageInspection.flags_for(Array.new(25, 255), 5, 5)
    assert_empty PhotoIntake::ImageInspection.flags_for(Array.new(256) { |i| i.even? ? 40 : 240 }, 16, 16)
    assert PhotoIntake::ImageInspection.near?("0000000000000000", "000000000000001f")
    refute PhotoIntake::ImageInspection.near?("0000000000000000", "000000000000003f")
  end

  test "sniffs image bytes rather than declared extension and rejects corrupt data" do
    Tempfile.create([ "fake", ".jpg" ], binmode: true) do |file|
      file.write("<svg><script>bad</script></svg>")
      file.flush
      assert_raises(PhotoIntake::ImageInspection::Invalid) { PhotoIntake::ImageInspection.new(file.path) }
      file.rewind
      file.truncate(0)
      file.write(image_bytes)
      file.flush
      assert_equal "image/png", PhotoIntake::ImageInspection.new(file.path).content_type
    end
  end

  test "review is idempotent and hold setting covers direct uploads before readiness" do
    @event.update!(gallery_hold_flagged: true)
    image = attach_image(@event, bytes: image_bytes(value: 0))
    PhotoIntake::Review.call(image)
    assert_equal %w[dark low_sharpness], image.reload.review_flags
    refute image.active?
    assert image.review_held?
    time = image.review_analyzed_at
    image.update_columns(reviewed_at: Time.current, active: true, review_held: false)
    PhotoIntake::Review.call(image)
    assert image.reload.active?
    assert_equal time, image.review_analyzed_at
    assert_equal "uploaded", image.status
  end

  test "actual image job generates variants gates public visibility and keeps manual hides" do
    @event.update!(gallery_hold_flagged: true)
    image = attach_image(@event, bytes: image_bytes(value: 0), category: "Podium")
    assert_empty @event.event_gallery_images.active.ready
    ProcessEventGalleryImageJob.perform_now(image.id)
    assert_equal "ready", image.reload.status
    assert image.variants_processed?
    refute image.active?
    assert image.review_held?
    assert_empty @event.event_gallery_images.active.ready
    assert_nil @event.event_gallery_albums.sole.summary[:cover_url]
    image.update_columns(active: true, reviewed_at: Time.current, review_held: false)
    ProcessEventGalleryImageJob.perform_now(image.id)
    assert image.reload.active?
    assert @event.event_gallery_albums.sole.summary[:cover_url]
    image.update_columns(active: false, review_held: false)
    PhotoIntake::Review.add_flag!(image, "near_duplicate", hold: true)
    refute image.reload.active?
    refute image.review_held?
  end

  test "replacement photo clears stale analysis and preserves a manual hide" do
    image = attach_image(@event, active: false)
    PhotoIntake::Review.call(image)
    assert image.reload.review_analyzed_at
    image.image.attach(io: StringIO.new(image_bytes(value: 0)), filename: "replacement.png", content_type: "image/png")
    image.reload
    assert_nil image.review_analyzed_at
    assert_nil image.content_sha256
    assert_nil image.processing_token
    assert_empty image.review_flags
    refute image.active?
    PhotoIntake::Review.call(image)
    assert_includes image.reload.review_flags, "dark"
    refute image.active?
  end

  test "new near duplicates do not rewrite peers already flagged for review" do
    images = [ 128, 129, 130 ].map { |value| attach_image(@event, bytes: image_bytes(value: value)) }
    PhotoIntake::Review.call(images[0])
    PhotoIntake::Review.call(images[1])
    updated = images[0].reload.updated_at
    PhotoIntake::Review.call(images[2])
    assert_includes images[2].reload.review_flags, "near_duplicate"
    assert_equal updated, images[0].reload.updated_at
  end

  test "default publishes and exact and perceptual duplicates are flagged within event" do
    first = attach_image(@event)
    second = attach_image(@event)
    near = attach_image(@event, bytes: image_bytes(value: 129))
    [ first, second, near ].each { |image| PhotoIntake::Review.call(image) }
    assert first.reload.active?
    assert_includes first.review_flags, "exact_duplicate"
    assert_includes second.reload.review_flags, "exact_duplicate"
    assert_includes near.reload.review_flags, "near_duplicate"
    assert_equal first.content_sha256, second.content_sha256
  end
end
