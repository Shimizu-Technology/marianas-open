require "test_helper"

class ClerkLinkingFlowTest < ActionDispatch::IntegrationTest
  setup do
    @user = User.create!(email: "invited-admin@example.com", clerk_id: "pending_admin", role: "admin", invitation_status: "pending")
    @decoded = { "sub" => "clerk_invitee", "email" => @user.email }
    @backend = {
      "id" => "clerk_invitee", "primary_email_address_id" => "email_primary",
      "email_addresses" => [ { "id" => "email_primary", "email_address" => @user.email, "verification" => { "status" => "verified", "strategy" => "ticket" } } ]
    }
    @verify = ClerkAuth.method(:verify)
    @get = HTTParty.method(:get)
    @secret = ENV["CLERK_SECRET_KEY"]
    ENV["CLERK_SECRET_KEY"] = "sk_test_stub"
    decoded = @decoded
    backend = @backend
    @requests = []
    requests = @requests
    ClerkAuth.define_singleton_method(:verify) { |_token| decoded }
    HTTParty.define_singleton_method(:get) do |url, **options|
      requests << [ url, options ]
      Struct.new(:parsed_response) { def success? = true }.new(backend)
    end
    @headers = { "Authorization" => "Bearer stubbed_valid_jwt" }
  end

  teardown do
    ClerkAuth.define_singleton_method(:verify, @verify)
    HTTParty.define_singleton_method(:get, @get)
    ENV["CLERK_SECRET_KEY"] = @secret
  end

  test "ticket verified invite without JWT email gains admin access and persists link" do
    @decoded.delete("email")
    get "/api/v1/admin/users", headers: @headers
    assert_response :success
    assert_equal "clerk_invitee", @user.reload.clerk_id
    assert_equal "accepted", @user.invitation_status
    assert_equal "admin", @user.role
    assert_equal "https://api.clerk.com/v1/users/clerk_invitee", @requests.first.first
    assert_equal "Bearer sk_test_stub", @requests.first.last.dig(:headers, "Authorization")
  end

  test "unverified JWT email is forbidden with a clear error and no saved link" do
    @backend["email_addresses"].first["verification"]["status"] = "unverified"
    get "/api/v1/admin/users", headers: @headers
    assert_response :forbidden
    assert_match "Verified email ownership could not be confirmed", response.parsed_body["error"]
    assert_equal "pending_admin", @user.reload.clerk_id
    assert_equal "pending", @user.invitation_status
  end

  test "unverified matching secondary email is forbidden" do
    @backend["email_addresses"].first["email_address"] = "different@example.com"
    @backend["email_addresses"] << { "id" => "secondary", "email_address" => @user.email, "verification" => { "status" => "unverified" } }
    get "/api/v1/admin/users", headers: @headers
    assert_response :forbidden
    assert_equal "pending_admin", @user.reload.clerk_id
  end

  test "Backend API HTTP failure is forbidden without logging identity or provider details" do
    HTTParty.define_singleton_method(:get) do |*_args, **_options|
      Struct.new(:success?).new(false)
    end
    log = StringIO.new
    logger = Rails.logger
    Rails.logger = ActiveSupport::Logger.new(log)
    get "/api/v1/admin/users", headers: @headers
    assert_response :forbidden
    assert_equal "pending_admin", @user.reload.clerk_id
    assert_includes log.string, "Clerk account linking denied"
    assert_not_includes log.string, @user.email
    assert_not_includes log.string, "clerk_invitee"
  ensure
    Rails.logger = logger
  end

  test "accepted real identity is never replaced even by verified email" do
    @user.update!(clerk_id: "existing_identity", invitation_status: "accepted")
    get "/api/v1/admin/users", headers: @headers
    assert_response :unauthorized
    assert_equal "existing_identity", @user.reload.clerk_id
    @decoded["sub"] = "existing_identity"
    @requests.clear
    get "/api/v1/admin/users", headers: @headers
    assert_response :success
    assert_empty @requests
  end
end
