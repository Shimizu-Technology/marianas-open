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
