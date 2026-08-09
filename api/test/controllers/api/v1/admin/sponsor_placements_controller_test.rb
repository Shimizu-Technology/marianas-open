require "test_helper"
require "stringio"

class Api::V1::Admin::SponsorPlacementsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @admin = User.create!(
      clerk_id: "placement-admin-clerk",
      email: "placement-admin@example.com",
      role: "admin"
    )
    organization = Organization.create!(name: "Marianas Open", slug: "marianas-open")
    sponsor = organization.sponsors.create!(name: "Island Sponsor")
    @placement = SponsorPlacement.create!(sponsor: sponsor, placement_type: "featured_bar")
  end

  test "featured bar upload rejects video before attaching it" do
    upload = Rack::Test::UploadedFile.new(
      StringIO.new("video"),
      "video/mp4",
      true,
      original_filename: "feature.mp4"
    )

    with_verified_user do
      post upload_media_api_v1_admin_sponsor_placement_path(@placement),
        params: { media: upload },
        headers: authorization_header
    end

    assert_response :unprocessable_entity
    assert_equal [ "Featured bar media must be an image." ], response.parsed_body["errors"]
    assert_not @placement.reload.media.attached?
  end

  private

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
