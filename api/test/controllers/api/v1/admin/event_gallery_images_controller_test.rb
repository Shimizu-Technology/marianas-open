require "test_helper"
require "stringio"

class Api::V1::Admin::EventGalleryImagesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @admin = User.create!(
      clerk_id: "gallery-admin-clerk",
      email: "gallery-admin@example.com",
      role: "admin"
    )
    organization = Organization.create!(name: "Marianas Open", slug: "marianas-open")
    @event = organization.events.create!(name: "Marianas Open", slug: "marianas-open")
  end

  test "bulk update rolls back every image when one image is invalid" do
    valid_image = create_gallery_image("valid.jpg")
    invalid_image = create_gallery_image("invalid.jpg")
    invalid_image.update_column(:sort_order, -1)

    with_verified_user do
      patch bulk_update_api_v1_admin_event_event_gallery_images_path(@event),
        params: { ids: [ valid_image.id, invalid_image.id ], active: false },
        headers: authorization_header
    end

    assert_response :unprocessable_entity
    assert_equal 0, response.parsed_body["updated"]
    assert_equal invalid_image.id, response.parsed_body["image_id"]
    assert valid_image.reload.active
    assert invalid_image.reload.active
  end

  private

  def create_gallery_image(filename)
    image = @event.event_gallery_images.build
    image.image.attach(io: StringIO.new("image"), filename: filename, content_type: "image/jpeg")
    image.save!
    image
  end

  def authorization_header
    { "Authorization" => "Bearer test-token" }
  end

  def with_verified_user
    original_verify = ClerkAuth.method(:verify)
    admin = @admin
    ClerkAuth.define_singleton_method(:verify) do |_token|
      { "sub" => admin.clerk_id, "email" => admin.email }
    end
    yield
  ensure
    ClerkAuth.define_singleton_method(:verify, original_verify)
  end
end
