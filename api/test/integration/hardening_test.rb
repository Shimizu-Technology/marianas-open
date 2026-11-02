require "test_helper"

class HardeningTest < ActionDispatch::IntegrationTest
  setup do
    @admin = User.create!(email: "admin@example.com", clerk_id: "admin_clerk", role: "admin", invitation_status: "accepted")
    @headers = { "Authorization" => "Bearer test_token_#{@admin.id}" }
    @organization = Organization.create!(name: "Marianas Open", slug: "marianas-open")
    @event = @organization.events.create!(name: "Public Event", slug: "public-event", date: Date.current, status: "upcoming")
  end

  test "public and admin lists clamp invalid pages and sizes" do
    paths = [
      "/api/v1/competitors", "/api/v1/academies",
      "/api/v1/admin/competitors", "/api/v1/admin/academies",
      "/api/v1/admin/events/#{@event.id}/results"
    ]
    paths.each do |path|
      [ "0", "-1", "abc", "9999999999999999999999999999999" ].each do |page|
        get path, params: { page: page, per_page: "-1" }, headers: @headers
        assert_response :success, path
        assert_operator response.parsed_body["page"], :>=, 1, path
        assert_equal 1, response.parsed_body["per_page"], path
      end
      get path, params: { per_page: "100000" }, headers: @headers
      assert_response :success, path
      assert_equal 200, response.parsed_body["per_page"], path
      get path, params: { per_page: "abc" }, headers: @headers
      assert_response :success, path
      assert_equal 1, response.parsed_body["per_page"], path
    end
  end

  test "gallery list pagination retains its smaller public cap" do
    [ [ "/api/v1/events/#{@event.slug}/gallery", 96 ],
      [ "/api/v1/admin/events/#{@event.id}/gallery-images", 200 ] ].each do |path, cap|
      get path, params: { page: "abc", per_page: "100000" }, headers: @headers
      assert_response :success
      assert_equal 1, response.parsed_body["page"]
      assert_equal cap, response.parsed_body["per_page"]
    end
  end

  test "legacy ranking filters cannot expose computed rankings" do
    %w[individual team country].each do |type|
      get "/api/v1/rankings", params: { type: type, limit: "100000" }
      assert_response :success
      assert response.parsed_body.key?("lists")
      assert_nil response.parsed_body["rankings"]
    end
  end

  test "last admin cannot be demoted" do
    patch "/api/v1/admin/users/#{@admin.id}", params: { role: "staff" }, headers: @headers, as: :json
    assert_response :unprocessable_entity
    assert_equal "Cannot demote the last admin user", response.parsed_body["error"]
    assert @admin.reload.admin?
  end

  test "admin cannot demote themselves when another admin exists" do
    User.create!(email: "second@example.com", clerk_id: "second_clerk", role: "admin")
    patch "/api/v1/admin/users/#{@admin.id}", params: { role: "viewer" }, headers: @headers, as: :json
    assert_response :unprocessable_entity
    assert_match "Cannot demote yourself", response.parsed_body["error"]
    assert @admin.reload.admin?
  end

  test "another admin can demote an admin and names can still be updated" do
    other = User.create!(email: "second@example.com", clerk_id: "second_clerk", role: "admin")
    patch "/api/v1/admin/users/#{other.id}", params: { role: "staff" }, headers: @headers, as: :json
    assert_response :success
    assert_equal "staff", other.reload.role
    patch "/api/v1/admin/users/#{@admin.id}", params: { first_name: "Updated" }, headers: @headers, as: :json
    assert_response :success
    assert_equal "Updated", @admin.reload.first_name
    delete "/api/v1/admin/users/#{@admin.id}", headers: @headers
    assert_response :unprocessable_entity
  end

  test "invite roles are explicitly validated before saving or contacting Clerk" do
    [ nil, "bogus", "" ].each do |role|
      assert_no_difference "User.count" do
        post "/api/v1/admin/users", params: { email: "invite@example.com", role: role }, headers: @headers, as: :json
      end
      assert_response :unprocessable_entity
      assert_equal [ "Role must be admin, staff or viewer for an invitation" ], response.parsed_body["errors"]
    end
  end

  test "valid invite role is preserved and unconfigured provider reports no send" do
    original = ENV.delete("CLERK_SECRET_KEY")
    post "/api/v1/admin/users", params: { email: "invite@example.com", role: "staff" }, headers: @headers, as: :json
    assert_response :created
    assert_equal "staff", response.parsed_body.dig("user", "role")
    assert_equal false, response.parsed_body["invitation_sent"]
  ensure
    ENV["CLERK_SECRET_KEY"] = original
  end

  test "admin UI invitation creates a linkable pending placeholder and preserves its role" do
    original = ENV.delete("CLERK_SECRET_KEY")
    original_get = HTTParty.method(:get)
    post "/api/v1/admin/users", params: { email: "invite-ui@example.com", role: "staff" }, headers: @headers, as: :json
    assert_response :created
    invited = User.find(response.parsed_body.dig("user", "id"))
    assert invited.invitation_pending?
    assert invited.clerk_id.start_with?("pending_")
    assert_equal @admin.id, invited.invited_by_id
    ENV["CLERK_SECRET_KEY"] = "sk_test_stub"
    HTTParty.define_singleton_method(:get) do |*_args, **_options|
      data = { "primary_email_address_id" => "primary", "email_addresses" => [
        { "id" => "primary", "email_address" => "invite-ui@example.com", "verification" => { "status" => "verified", "strategy" => "ticket" } }
      ] }
      Struct.new(:parsed_response) { def success? = true }.new(data)
    end
    auth = Class.new { include ClerkAuthenticatable }.new
    attrs = { clerk_id: "clerk_ui_invitee", email: "INVITE-UI@example.com", first_name: "Invite", last_name: "Test" }
    assert_equal invited.id, auth.send(:find_or_create_user, **attrs).id
    assert_equal "accepted", invited.reload.invitation_status
    assert_equal "staff", invited.role
    assert_nil auth.send(:find_or_create_user, **attrs.merge(clerk_id: "clerk_replacement"))
    assert_equal "clerk_ui_invitee", invited.reload.clerk_id
  ensure
    HTTParty.define_singleton_method(:get, original_get)
    ENV["CLERK_SECRET_KEY"] = original
  end

  test "viewer can read shared admin content" do
    viewer = User.create!(email: "viewer@example.com", clerk_id: "viewer_clerk", role: "viewer")
    get "/api/v1/admin/competitors", headers: { "Authorization" => "Bearer test_token_#{viewer.id}" }
    assert_response :success
  end
end
