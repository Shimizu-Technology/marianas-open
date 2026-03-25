require "cgi"

class UserInviteEmailService
  BRAND_NAME = "Marianas Open"
  LOGO_URL = "https://marianas-open.netlify.app/images/logos/mo-logo-white.png"

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
          <body style="margin: 0; padding: 0; background-color: #0a0a0b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0a0a0b;">
              <tr>
                <td align="center" style="padding: 40px 16px;">

                  <!-- Card -->
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 500px; background-color: #111318; border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; overflow: hidden;">

                    <!-- Gold accent -->
                    <tr><td style="height: 3px; background-color: #D4A843; font-size: 0; line-height: 0;">&nbsp;</td></tr>

                    <!-- Logo -->
                    <tr>
                      <td style="padding: 32px 32px 0 32px; text-align: center;">
                        <img src="#{h(LOGO_URL)}" alt="#{h(BRAND_NAME)}" width="200" style="display: inline-block; width: 200px; max-width: 100%; height: auto;" />
                      </td>
                    </tr>

                    <!-- Divider -->
                    <tr>
                      <td style="padding: 24px 32px 0 32px;">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                          <tr><td style="height: 1px; background-color: rgba(255,255,255,0.06); font-size: 0;">&nbsp;</td></tr>
                        </table>
                      </td>
                    </tr>

                    <!-- Heading -->
                    <tr>
                      <td style="padding: 28px 32px 0 32px; text-align: center;">
                        <p style="margin: 0 0 10px 0; color: #D4A843; font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; font-weight: 700;">
                          Admin Invitation
                        </p>
                        <h1 style="margin: 0; color: #ececec; font-size: 22px; line-height: 1.4; font-weight: 700;">
                          You've been invited to join<br>the #{h(BRAND_NAME)} team
                        </h1>
                      </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                      <td style="padding: 20px 32px 0 32px; text-align: center;">
                        <p style="margin: 0; font-size: 14px; line-height: 1.7; color: #9ca3af;">
                          #{inviter} has added you as <strong style="color: #ececec;">#{role}</strong>.
                        </p>
                      </td>
                    </tr>

                    <!-- Info box -->
                    <tr>
                      <td style="padding: 20px 32px 0 32px;">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #191c24; border: 1px solid rgba(212,168,67,0.12); border-radius: 8px;">
                          <tr>
                            <td style="padding: 16px;">
                              <p style="margin: 0 0 4px 0; color: #D4A843; font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; font-weight: 700;">
                                Getting started
                              </p>
                              <p style="margin: 0; font-size: 13px; line-height: 1.7; color: #9ca3af;">
                                Click the button below to create your account using
                                <strong style="color: #ececec;">#{h(user.email)}</strong>.
                                Choose <strong style="color: #ececec;">Sign up</strong> if this is your first time.
                              </p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>

                    <!-- CTA -->
                    <tr>
                      <td style="padding: 24px 32px 0 32px;" align="center">
                        <table role="presentation" cellspacing="0" cellpadding="0">
                          <tr>
                            <td style="border-radius: 6px; background-color: #D4A843;">
                              <a href="#{h(button_link)}" target="_blank" style="display: inline-block; padding: 13px 36px; color: #0a0a0b; text-decoration: none; font-size: 14px; font-weight: 700; letter-spacing: 0.01em;">
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
                        <p style="margin: 0 0 3px 0; font-size: 11px; color: #6b7280;">Or open this link in your browser:</p>
                        <p style="margin: 0; font-size: 11px; word-break: break-all;">
                          <a href="#{h(button_link)}" style="color: #D4A843; text-decoration: none;">#{h(display_url)}</a>
                        </p>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td style="padding: 28px 32px 32px 32px;">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                          <tr><td style="height: 1px; background-color: rgba(255,255,255,0.06); font-size: 0;">&nbsp;</td></tr>
                        </table>
                        <p style="margin: 16px 0 0 0; font-size: 11px; line-height: 1.6; color: #6b7280; text-align: center;">
                          If you already have an account, sign in normally.<br>
                          If you were not expecting this invite, you can ignore this email.
                        </p>
                      </td>
                    </tr>

                  </table>
                  <!-- /Card -->

                </td>
              </tr>
            </table>
          </body>
        </html>
      HTML
    end
  end
end
