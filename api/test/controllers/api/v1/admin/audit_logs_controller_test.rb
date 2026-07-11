require "test_helper"

class Api::V1::Admin::AuditLogsControllerTest < ActionDispatch::IntegrationTest
  test "viewer cannot read audit history" do
    user = User.create!(
      clerk_id: "viewer-clerk",
      email: "viewer@example.com",
      role: "viewer"
    )

    with_verified_user(user) do
      get api_v1_admin_audit_logs_path, headers: authorization_header
    end

    assert_response :forbidden
    assert_equal "Staff access required", response.parsed_body["error"]
  end

  test "staff can read audit history" do
    user = User.create!(
      clerk_id: "staff-clerk",
      email: "staff@example.com",
      role: "staff"
    )

    with_verified_user(user) do
      get api_v1_admin_audit_logs_path, headers: authorization_header
    end

    assert_response :ok
    assert_equal [], response.parsed_body["audit_logs"]
  end

  private

  def authorization_header
    { "Authorization" => "Bearer test-token" }
  end

  def with_verified_user(user)
    original_verify = ClerkAuth.method(:verify)
    ClerkAuth.define_singleton_method(:verify) do |_token|
      { "sub" => user.clerk_id, "email" => user.email }
    end
    yield
  ensure
    ClerkAuth.define_singleton_method(:verify, original_verify)
  end
end
