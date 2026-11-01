require "test_helper"

class ClerkLinkingTest < ActiveSupport::TestCase
  setup do
    @auth = Class.new { include ClerkAuthenticatable }.new
    @user = User.create!(email: "invite@example.com", clerk_id: "pending_123", role: "staff", invitation_status: "pending")
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
end
