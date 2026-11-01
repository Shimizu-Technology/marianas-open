require "test_helper"

class InvitationUrlTest < ActiveSupport::TestCase
  setup do
    @env = ENV.to_h.slice("PUBLIC_FRONTEND_URL", "FRONTEND_URL", "ALLOWED_ORIGINS", "CLERK_SECRET_KEY", "RESEND_API_KEY", "RESEND_FROM_EMAIL")
    ENV["PUBLIC_FRONTEND_URL"] = "https://marianasopen.com/"
    ENV["FRONTEND_URL"] = "http://localhost:5173"
    ENV["ALLOWED_ORIGINS"] = "http://localhost:5173,https://marianasopen.com"
    ENV["CLERK_SECRET_KEY"] = "local-test"
    ENV["RESEND_API_KEY"] = "local-test"
    ENV["RESEND_FROM_EMAIL"] = "noreply@example.test"
  end

  teardown do
    %w[PUBLIC_FRONTEND_URL FRONTEND_URL ALLOWED_ORIGINS CLERK_SECRET_KEY RESEND_API_KEY RESEND_FROM_EMAIL].each { |key| ENV[key] = @env[key] }
  end

  test "explicit public origin takes precedence and invitation retains Clerk ticket URL" do
    assert_equal "https://marianasopen.com/admin", FrontendUrl.admin
    ticket_url = "https://clerk.example.test/invite?__clerk_ticket=local-test-ticket"
    request_body = nil
    original_post = HTTParty.method(:post)
    result = Struct.new(:parsed_response) { def success? = true }.new({ "id" => "inv_123", "url" => ticket_url })
    HTTParty.define_singleton_method(:post) do |_url, **options|
      request_body = JSON.parse(options[:body])
      result
    end
    invitation = ClerkInvitationService.new.create_invitation(email: "test@example.test", redirect_url: FrontendUrl.admin)
    assert_equal "https://marianasopen.com/admin", request_body["redirect_url"]
    assert_equal false, request_body["notify"]
    assert_equal ticket_url, invitation[:url]

    user = User.create!(clerk_id: "pending_test", email: "test@example.test", role: "staff")
    original_send = Resend::Emails.method(:send)
    message = nil
    Resend::Emails.define_singleton_method(:send) { |body| message = body; {} }
    assert UserInviteEmailService.send_invite(user: user, invited_by: nil, invitation_url: invitation[:url])
    assert_includes message[:html], ticket_url
    assert_includes message[:html], "https://marianasopen.com/admin"
    assert_not_includes message[:html], "localhost"
  ensure
    HTTParty.define_singleton_method(:post, original_post) if original_post
    Resend::Emails.define_singleton_method(:send, original_send) if original_send
  end
end
