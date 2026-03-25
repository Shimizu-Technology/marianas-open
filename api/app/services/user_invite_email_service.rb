require "cgi"

class UserInviteEmailService
  BRAND_NAME = "Marianas Open"

  class << self
    def send_invite(user:, invited_by:, invitation_url: nil)
      return false unless configured?

      button_link = invitation_url.presence || "#{frontend_url}/admin"
      display_url = "#{frontend_url}/admin"

      response = Resend::Emails.send(
        {
          from: from_email,
          to: user.email,
          subject: "You're invited to the #{BRAND_NAME} admin",
          html: invite_html(user: user, invited_by: invited_by, button_link: button_link, display_url: display_url)
        }
      )

      Rails.logger.info("[InviteEmail] sent invite to #{user.email} response=#{response.inspect}")
      true
    rescue StandardError => e
      Rails.logger.error("[InviteEmail] failed for #{user.email}: #{e.class} #{e.message}")
      false
    end

    def configured?
      if ENV["RESEND_API_KEY"].blank?
        Rails.logger.warn("[InviteEmail] RESEND_API_KEY not configured; skipping invite email")
        return false
      end

      if from_email.blank?
        Rails.logger.warn("[InviteEmail] RESEND_FROM_EMAIL not configured; skipping invite email")
        return false
      end

      true
    end

    private

    def from_email
      ENV["RESEND_FROM_EMAIL"].presence || ENV["MAILER_FROM_EMAIL"].presence
    end

    def frontend_url
      allowed = ENV.fetch("ALLOWED_ORIGINS", "http://localhost:5173")
      allowed.split(",").first.strip
    end

    def logo_url
      "#{frontend_url}/images/logos/mo-logo-white.png"
    end

    def h(value)
      CGI.escapeHTML(value.to_s)
    end

    def invite_html(user:, invited_by:, button_link:, display_url:)
      inviter = h(invited_by&.full_name.presence || invited_by&.email.presence || "An administrator")
      role = h(user.role.capitalize)

      <<~HTML
        <!doctype html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta name="color-scheme" content="dark only">
            <meta name="supported-color-schemes" content="dark only">
            <title>#{h(BRAND_NAME)} Invitation</title>
          </head>
          <body style="margin: 0; padding: 0; background-color: #0a0a0b; color: #ececec; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
            <!-- Outer wrapper -->
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0a0a0b;">
              <tr>
                <td align="center" style="padding: 32px 16px;">
                  <!-- Card -->
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #111318; border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; overflow: hidden;">
                    <!-- Gold accent bar -->
                    <tr>
                      <td style="height: 3px; background-color: #D4A843; font-size: 0; line-height: 0;">&nbsp;</td>
                    </tr>

                    <!-- Logo -->
                    <tr>
                      <td style="padding: 28px 32px 0 32px; text-align: center;">
                        <img src="#{h(logo_url)}" alt="#{h(BRAND_NAME)}" width="180" style="display: inline-block; width: 180px; height: auto;" />
                      </td>
                    </tr>

                    <!-- Divider -->
                    <tr>
                      <td style="padding: 20px 32px 0 32px;">
                        <div style="height: 1px; background-color: rgba(255,255,255,0.06);"></div>
                      </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                      <td style="padding: 24px 32px 0 32px;">
                        <p style="margin: 0 0 6px 0; color: #D4A843; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; font-weight: 700; text-align: center;">
                          Admin Invitation
                        </p>
                        <h1 style="margin: 0 0 20px 0; color: #ececec; font-size: 22px; line-height: 1.35; font-weight: 700; text-align: center;">
                          You've been invited to join<br>the #{h(BRAND_NAME)} team
                        </h1>
                        <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.7; color: #9ca3af; text-align: center;">
                          #{inviter} has added you as <strong style="color: #ececec;">#{role}</strong>.
                        </p>
                      </td>
                    </tr>

                    <!-- Info box -->
                    <tr>
                      <td style="padding: 0 32px;">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: rgba(212,168,67,0.06); border: 1px solid rgba(212,168,67,0.15); border-radius: 8px;">
                          <tr>
                            <td style="padding: 14px 16px;">
                              <p style="margin: 0; font-size: 13px; line-height: 1.7; color: #9ca3af;">
                                Create your account using <strong style="color: #ececec;">#{h(user.email)}</strong>.<br>
                                Choose <strong style="color: #ececec;">Sign up</strong> if this is your first time.
                              </p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>

                    <!-- CTA Button -->
                    <tr>
                      <td style="padding: 24px 32px 0 32px;" align="center">
                        <table role="presentation" cellspacing="0" cellpadding="0">
                          <tr>
                            <td style="border-radius: 6px; background-color: #D4A843;">
                              <a href="#{h(button_link)}" target="_blank" style="display: inline-block; padding: 12px 32px; color: #0a0a0b; text-decoration: none; font-size: 14px; font-weight: 700;">
                                Accept Invitation
                              </a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>

                    <!-- Fallback URL -->
                    <tr>
                      <td style="padding: 16px 32px 0 32px; text-align: center;">
                        <p style="margin: 0 0 4px 0; font-size: 11px; color: #6b7280;">
                          Or copy this URL into your browser:
                        </p>
                        <p style="margin: 0; font-size: 11px; word-break: break-all;">
                          <a href="#{h(display_url)}" style="color: #D4A843; text-decoration: none;">#{h(display_url)}</a>
                        </p>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td style="padding: 24px 32px 28px 32px; text-align: center;">
                        <div style="height: 1px; background-color: rgba(255,255,255,0.06); margin-bottom: 16px;"></div>
                        <p style="margin: 0; font-size: 11px; line-height: 1.6; color: #6b7280;">
                          If you already have an account, sign in normally.<br>
                          If you were not expecting this invite, you can ignore this email.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      HTML
    end
  end
end
