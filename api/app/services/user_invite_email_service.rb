class UserInviteEmailService
  BRAND_NAME = "Marianas Open"
  BRAND_TAGLINE = "International Jiu-Jitsu Championship"

  class << self
    def send_invite(user:, invited_by:, invitation_url: nil)
      return false unless configured?

      link = invitation_url.presence || "#{frontend_url}/admin"

      response = Resend::Emails.send(
        {
          from: from_email,
          to: user.email,
          subject: "You're invited to the #{BRAND_NAME} admin",
          html: invite_html(user: user, invited_by: invited_by, link: link)
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

    def escape_html(value)
      CGI.escapeHTML(value.to_s)
    end

    def invite_html(user:, invited_by:, link:)
      inviter = escape_html(invited_by&.full_name.presence || invited_by&.email.presence || "An administrator")
      role = escape_html(user.role.capitalize)

      <<~HTML
        <!doctype html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>#{escape_html(BRAND_NAME)} — Staff Invitation</title>
          </head>
          <body style="margin: 0; padding: 0; background: #0c1220; color: #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: #0c1220;">
              <tr>
                <td style="background: #d5a332; padding: 10px 20px; text-align: center;">
                  <p style="margin: 0; color: #0c1220; font-size: 11px; letter-spacing: 0.24em; text-transform: uppercase; font-weight: 700;">#{escape_html(BRAND_TAGLINE)}</p>
                </td>
              </tr>
            </table>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding: 24px 12px; background: #0c1220;">
              <tr>
                <td align="center">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background: #151d2e; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; overflow: hidden;">
                    <tr>
                      <td style="height: 4px; background: linear-gradient(90deg, #d5a332, #b8860b); font-size: 0; line-height: 0;">&nbsp;</td>
                    </tr>
                    <tr>
                      <td style="padding: 32px 28px 8px 28px; text-align: center;">
                        <p style="margin: 0 0 8px 0; color: #d5a332; font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase; font-weight: 700;">
                          Admin Invitation
                        </p>
                        <h1 style="margin: 0 0 12px 0; color: #f1f5f9; font-size: 26px; line-height: 1.3; font-weight: 800;">
                          You're invited to<br>#{escape_html(BRAND_NAME)}
                        </h1>
                        <div style="width: 60px; height: 3px; margin: 0 auto 20px auto; border-radius: 999px; background: #d5a332;"></div>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 0 28px 28px 28px;">
                        <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.7; color: #94a3b8;">
                          #{inviter} has invited you as <strong style="color: #f1f5f9;">#{role}</strong> on the #{escape_html(BRAND_NAME)} admin panel.
                        </p>

                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 20px 0; background: rgba(213,163,50,0.08); border: 1px solid rgba(213,163,50,0.2); border-radius: 12px;">
                          <tr>
                            <td style="padding: 14px 16px;">
                              <p style="margin: 0 0 6px 0; color: #d5a332; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; font-weight: 700;">
                                Getting started
                              </p>
                              <p style="margin: 0; font-size: 14px; line-height: 1.7; color: #94a3b8;">
                                Click the button below to create your account using <strong style="color: #f1f5f9;">#{escape_html(user.email)}</strong>.
                                Choose <strong style="color: #f1f5f9;">Sign up</strong> if this is your first time.
                              </p>
                            </td>
                          </tr>
                        </table>

                        <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto 20px auto;">
                          <tr>
                            <td style="border-radius: 8px; background: #d5a332;">
                              <a href="#{escape_html(link)}" target="_blank" style="display: inline-block; padding: 14px 32px; color: #0c1220; text-decoration: none; font-size: 14px; font-weight: 800; letter-spacing: 0.02em;">
                                Accept Invitation
                              </a>
                            </td>
                          </tr>
                        </table>

                        <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748b;">
                          Or copy this URL into your browser:
                        </p>
                        <p style="margin: 0 0 20px 0; font-size: 12px; color: #d5a332; word-break: break-all;">
                          #{escape_html(link)}
                        </p>

                        <p style="margin: 0; font-size: 11px; line-height: 1.6; color: #475569;">
                          If you already created your account, you can sign in normally.<br>
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
