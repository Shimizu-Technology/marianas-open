require "test_helper"

class Api::V1::Admin::SeasonsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @admin = User.create!(
      clerk_id: "season-admin-clerk",
      email: "season-admin@example.com",
      role: "admin"
    )
  end

  test "deletes an empty season" do
    season = Season.create!(year: 2027, name: "2027 Marianas Open Circuit")

    with_verified_user do
      delete api_v1_admin_season_path(season), headers: authorization_header
    end

    assert_response :no_content
    assert_not Season.exists?(season.id)
  end

  test "returns a validation error when a season has events" do
    organization = Organization.create!(name: "Marianas Open", slug: "marianas-open")
    season = Season.create!(year: 2027, name: "2027 Marianas Open Circuit")
    organization.events.create!(name: "Marianas Open 2027", slug: "marianas-open-2027", season: season)

    with_verified_user do
      delete api_v1_admin_season_path(season), headers: authorization_header
    end

    assert_response :unprocessable_entity
    assert Season.exists?(season.id)
    assert response.parsed_body["errors"].present?
  end

  test "show returns compact event summaries" do
    organization = Organization.create!(name: "Marianas Open", slug: "marianas-open")
    season = Season.create!(year: 2027, name: "2027 Marianas Open Circuit")
    event = organization.events.create!(name: "Marianas Open 2027", slug: "marianas-open-2027", season: season)

    with_verified_user do
      get api_v1_admin_season_path(season), headers: authorization_header
    end

    assert_response :ok
    summary = response.parsed_body.dig("season", "events").sole
    assert_equal event.id, summary["id"]
    assert_equal %w[date id name slug status], summary.keys.sort
  end

  test "viewer can read seasons" do
    viewer = User.create!(
      clerk_id: "season-viewer-clerk",
      email: "season-viewer@example.com",
      role: "viewer"
    )
    Season.create!(year: 2027, name: "2027 Marianas Open Circuit")

    with_verified_user(viewer) do
      get api_v1_admin_seasons_path, headers: authorization_header
    end

    assert_response :ok
    assert_equal 1, response.parsed_body["seasons"].size
  end

  test "viewer cannot create a season" do
    viewer = User.create!(
      clerk_id: "season-write-viewer-clerk",
      email: "season-write-viewer@example.com",
      role: "viewer"
    )

    assert_no_difference("Season.count") do
      with_verified_user(viewer) do
        post api_v1_admin_seasons_path,
          params: { year: 2027, name: "2027 Marianas Open Circuit" },
          headers: authorization_header
      end
    end

    assert_response :forbidden
    assert_equal "Viewer access is read-only", response.parsed_body["error"]
  end

  test "activating a season demotes the prior current season" do
    previous = Season.create!(year: 2026, name: "2026 Marianas Open Circuit", status: "active", current: true)
    target = Season.create!(year: 2027, name: "2027 Marianas Open Circuit")

    with_verified_user do
      post activate_api_v1_admin_season_path(target), headers: authorization_header
    end

    assert_response :ok
    assert_not previous.reload.current
    assert target.reload.current
    assert_equal "active", target.status
    assert_equal 1, Season.where(current: true).count
  end

  private

  def authorization_header
    { "Authorization" => "Bearer test-token" }
  end

  def with_verified_user(user = @admin)
    original_verify = ClerkAuth.method(:verify)
    ClerkAuth.define_singleton_method(:verify) do |_token|
      { "sub" => user.clerk_id, "email" => user.email }
    end
    yield
  ensure
    ClerkAuth.define_singleton_method(:verify, original_verify)
  end
end
