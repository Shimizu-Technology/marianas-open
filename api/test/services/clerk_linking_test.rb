require "test_helper"

class ClerkLinkingTest < ActiveSupport::TestCase
  setup do
    @secret = ENV["CLERK_SECRET_KEY"]
    ENV["CLERK_SECRET_KEY"] = "sk_test_stub"
    @get = HTTParty.method(:get)
    @backend_user = {
      "id" => "new_clerk", "primary_email_address_id" => "id_primary",
      "email_addresses" => [ { "id" => "id_primary", "email_address" => "invite@example.com", "verification" => { "status" => "verified", "strategy" => "from_oauth_google" } } ]
    }
    backend_user = @backend_user
    HTTParty.define_singleton_method(:get) do |*_args, **_options|
      Struct.new(:parsed_response) { def success? = true }.new(backend_user)
    end
    @auth = Class.new { include ClerkAuthenticatable }.new
    @user = User.create!(email: "invite@example.com", clerk_id: "pending_123", role: "staff", invitation_status: "pending")
  end

  teardown do
    HTTParty.define_singleton_method(:get, @get)
    ENV["CLERK_SECRET_KEY"] = @secret
  end

  def link(id = "new_clerk")
    @auth.send(:find_or_create_user, clerk_id: id, email: "INVITE@example.com", first_name: "Invited", last_name: "User")
  end

  test "pending placeholder links once and accepts invitation" do
    assert_equal @user.id, link.id
    assert_equal "new_clerk", @user.reload.clerk_id
    assert_equal "accepted", @user.invitation_status
    assert_nil link("different_clerk")
    assert_equal "new_clerk", @user.reload.clerk_id
    assert_equal @user.id, link.id
  end

  test "revoked and expired placeholders cannot link" do
    %w[revoked expired].each do |status|
      @user.update!(invitation_status: status)
      assert_nil link
      assert_equal "pending_123", @user.reload.clerk_id
    end
  end

  test "seed-shaped legacy admin with default accepted status links only once" do
    @user.destroy!
    @user = User.create!(email: "invite@example.com", clerk_id: "pending_admin_#{SecureRandom.uuid}", role: "admin")
    assert_equal "accepted", @user.invitation_status
    assert_equal @user.id, link.id
    assert_equal "new_clerk", @user.reload.clerk_id
    assert_nil link("replacement_clerk")
    assert_equal @user.id, link.id
  end

  test "already-linked legacy admin keeps its identity and role" do
    @user.update!(clerk_id: "existing_clerk", invitation_status: "accepted", role: "admin")
    assert_equal @user.id, link("existing_clerk").id
    assert_nil link("replacement_clerk")
    assert_equal "admin", @user.reload.role
    assert_equal "existing_clerk", @user.clerk_id
  end

  test "real clerk identity cannot be replaced even with pending status" do
    @user.update!(clerk_id: "existing_clerk")
    assert_nil link
    assert_equal "existing_clerk", @user.reload.clerk_id
  end

  test "uninvited and missing subject cannot link" do
    assert_nil link(nil)
    @user.destroy!
    assert_nil link
  end
  test "unverified primary email cannot claim a pending admin via JWT email" do
    @user.update!(role: "admin")
    @backend_user["email_addresses"].first["verification"]["status"] = "unverified"
    assert_nil link
    assert_equal "pending_123", @user.reload.clerk_id
    assert_equal "pending", @user.invitation_status
  end

  test "matching unverified secondary email cannot claim a pending account" do
    @backend_user["email_addresses"].first["email_address"] = "other@example.com"
    @backend_user["email_addresses"] << { "id" => "id_secondary", "email_address" => @user.email, "verification" => { "status" => "unverified" } }
    assert_nil link
    assert_equal "pending_123", @user.reload.clerk_id
  end

  test "Backend API outage refuses linking and preserves invitation" do
    HTTParty.define_singleton_method(:get) { |*_args, **_options| raise SocketError, "contains private provider details" }
    assert_nil link
    assert_equal "pending_123", @user.reload.clerk_id
    assert_equal "pending", @user.invitation_status
  end

  test "verified ticket signup links without a JWT email claim" do
    @backend_user["email_addresses"].first["verification"]["strategy"] = "ticket"
    linked = @auth.send(:find_or_create_user, clerk_id: "new_clerk", email: nil, first_name: nil, last_name: nil)
    assert_equal @user.id, linked.id
    assert_equal "accepted", @user.reload.invitation_status
  end

  test "row lock recheck prevents replacing an identity linked during provider lookup" do
    user = @user
    data = @backend_user
    HTTParty.define_singleton_method(:get) do |*_args, **_options|
      user.update!(clerk_id: "concurrently_linked", invitation_status: "accepted")
      Struct.new(:parsed_response) { def success? = true }.new(data)
    end
    assert_nil link
    assert_equal "concurrently_linked", @user.reload.clerk_id
  end
end
