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

  test "rankings clamp limits for every ranking type" do
    %w[individual team country].each do |type|
      { "100000" => 200, "abc" => 1, "-1" => 1, "0" => 1 }.each do |limit, expected|
        get "/api/v1/rankings", params: { type: type, limit: limit }
        assert_response :success
        assert_equal expected, response.parsed_body.dig("meta", "filters", "limit")
      end
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
    [ nil, "viewer", "bogus", "" ].each do |role|
      assert_no_difference "User.count" do
        post "/api/v1/admin/users", params: { email: "invite@example.com", role: role }, headers: @headers, as: :json
      end
      assert_response :unprocessable_entity
      assert_equal [ "Role must be admin or staff for an invitation" ], response.parsed_body["errors"]
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

  test "viewer has no staff access" do
    viewer = User.create!(email: "viewer@example.com", clerk_id: "viewer_clerk", role: "viewer")
    get "/api/v1/admin/competitors", headers: { "Authorization" => "Bearer test_token_#{viewer.id}" }
    assert_response :forbidden
  end
end
