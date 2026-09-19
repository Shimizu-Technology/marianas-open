require "test_helper"
require "base64"
require "stringio"

class HasImageUrlTest < ActiveSupport::TestCase
  test "site images use a stable Active Storage path for local and private S3 blobs" do
    site_image = SiteImage.create!(placement: "hero", title: "Test image")
    site_image.image.attach(
      io: StringIO.new(Base64.decode64("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=")),
      filename: "image.png",
      content_type: "image/png"
    )
    blob = site_image.image.blob
    original_service = blob.service_name

    assert_match %r{\A/rails/active_storage/blobs/}, site_image.image_url

    blob.update_column(:service_name, "amazon")
    assert_match %r{\A/rails/active_storage/blobs/}, site_image.image_url
    refute_includes site_image.image_url, "amazonaws.com"
  ensure
    blob&.update_column(:service_name, original_service) if blob&.persisted?
  end
end
