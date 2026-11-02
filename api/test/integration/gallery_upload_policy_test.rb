require "test_helper"
require_relative "../support/gallery_capability_helpers"

class GalleryUploadPolicyTest < ActionDispatch::IntegrationTest
  include GalleryCapabilityHelpers

  setup do
    @event = Organization.create!(name: "Formats", slug: "formats").events.create!(name: "Formats", slug: "formats")
    @user = User.create!(email: "formats@example.com", clerk_id: "formats", role: "staff")
    @headers = { "Authorization" => "Bearer test_token_#{@user.id}" }
    @base = "/api/v1/admin/events/#{@event.id}/gallery-images"
  end

  test "upload policy and direct upload reflect both native capability states" do
    [ false, true ].each do |supported|
      with_heif_capability(supported) do
        get "#{@base}/upload_policy", headers: @headers
        assert_response :success
        policy = response.parsed_body.fetch("upload_policy")
        assert_includes policy["content_types"], "image/jpeg"
        %w[heic heif avif].each do |format|
          assert_equal supported, policy["content_types"].include?("image/#{format}")
          assert_equal supported, policy["extensions"].include?(".#{format}")
          post "#{@base}/prepare_direct_upload", headers: @headers, as: :json,
            params: { filename: "phone.#{format}", content_type: "application/octet-stream", byte_size: 10, checksum: Base64.strict_encode64(Digest::MD5.digest("0123456789")) }
          assert_response(supported ? :success : :unprocessable_entity)
          unless supported
            assert_includes response.parsed_body["error"], "This photo is #{format.upcase}"
            assert_includes response.parsed_body["error"], "for ZIPs, export as JPEG"
          end
        end
      end
    end
  end

  test "unsupported formats cannot bypass validation through MIME or filename mismatches" do
    with_heif_capability(false) do
      [ [ "phone.heic", "image/jpeg" ], [ "phone.jpg", "image/heic" ] ].each do |filename, content_type|
        assert_no_difference "ActiveStorage::Blob.count" do
          post "#{@base}/prepare_direct_upload", headers: @headers, as: :json,
            params: { filename: filename, content_type: content_type, byte_size: 10, checksum: "unused" }
          assert_response :unprocessable_entity
        end
      end
      image = @event.event_gallery_images.new(status: "uploaded")
      image.image.attach(io: StringIO.new("not decoded"), filename: "phone.HEIC", content_type: "image/heic", identify: false)
      refute image.valid?
      assert_includes image.errors.full_messages.join, "This photo is HEIC"
    end
  end

  test "policy requires sign-in and allows read-only viewers" do
    get "#{@base}/upload_policy"
    assert_response :unauthorized
    @user.update!(role: "viewer")
    get "#{@base}/upload_policy", headers: @headers
    assert_response :success
  end
end
