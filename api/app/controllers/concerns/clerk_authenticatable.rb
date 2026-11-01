module ClerkAuthenticatable
  extend ActiveSupport::Concern

  private

  def authenticate_user!
    header = request.headers["Authorization"]

    unless header.present?
      render_unauthorized("Missing authorization header")
      return
    end

    token = header.split(" ").last
    decoded = ClerkAuth.verify(token)

    unless decoded
      render_unauthorized("Invalid or expired token")
      return
    end

    clerk_id = decoded["sub"]
    email = decoded["email"] || decoded["primary_email_address"]
    first_name = decoded["first_name"]
    last_name = decoded["last_name"]

    @current_user = find_or_create_user(
      clerk_id: clerk_id,
      email: email,
      first_name: first_name,
      last_name: last_name
    )

    unless @current_user
      if @clerk_linking_failed
        render_forbidden("Verified email ownership could not be confirmed. Verify your email and try again, or contact an administrator.")
      else
        render_unauthorized("User not found. Contact an administrator for access.")
      end
    end
  end

  def authenticate_user_optional
    header = request.headers["Authorization"]
    return unless header.present?

    token = header.split(" ").last
    decoded = ClerkAuth.verify(token)
    return unless decoded

    @current_user = User.find_by(clerk_id: decoded["sub"])
  end

  def current_user
    @current_user
  end

  def require_admin!
    authenticate_user! unless @current_user
    return if performed?

    unless @current_user&.admin?
      render_forbidden("Admin access required")
    end
  end

  def require_staff!
    authenticate_user! unless @current_user
    return if performed?

    unless @current_user&.staff?
      render_forbidden("Staff access required")
    end
  end

  def find_or_create_user(clerk_id:, email:, first_name:, last_name:)
    return nil if clerk_id.blank?

    # Find by clerk_id (returning user)
    user = User.find_by(clerk_id: clerk_id)

    if user
      updates = {}
      updates[:email] = email if email.present? && email != user.email
      updates[:first_name] = first_name if first_name.present?
      updates[:last_name] = last_name if last_name.present?
      user.update(updates) if updates.any?
      return user
    end

    # JWT email claims can locate an invitation, but never prove ownership.
    # Fetch outside the row lock; recheck eligibility and the verified match in it.
    clerk_user = fetch_clerk_user(clerk_id)
    unless clerk_user
      return deny_clerk_linking
    end
    email = clerk_user[:email] if email.blank?
    first_name ||= clerk_user[:first_name]
    last_name ||= clerk_user[:last_name]

    if email.present?
      user = User.find_by("LOWER(email) = ?", email.downcase)
      if user
        user.with_lock do
          # Legacy seeds predate invitation tracking and defaulted to accepted.
          # A placeholder proves no Clerk identity has been linked yet; explicit
          # revocation/expiry still blocks access. Never replace a real identity.
          return nil unless user.clerk_id.start_with?("pending_") && %w[pending accepted].include?(user.invitation_status)
          return deny_clerk_linking unless clerk_user[:verified_emails].include?(user.email.downcase)

          attrs = { clerk_id: clerk_id, invitation_status: "accepted" }
          attrs[:first_name] = first_name if first_name.present?
          attrs[:last_name] = last_name if last_name.present?
          return user if user.update(attrs)
        end
      end
    end

    # Not invited — deny access
    # Note: First user must be manually seeded in db/seeds.rb
    nil
  end

  def render_unauthorized(message = "Unauthorized")
    render json: { error: message }, status: :unauthorized
  end

  def render_forbidden(message = "Forbidden")
    render json: { error: message }, status: :forbidden
  end

  def deny_clerk_linking
    @clerk_linking_failed = true
    Rails.logger.warn("Clerk account linking denied: verified email ownership unavailable")
    nil
  end

  def fetch_clerk_user(clerk_id)
    secret = ENV["CLERK_SECRET_KEY"]
    return nil if secret.blank?

    response = HTTParty.get(
      "https://api.clerk.com/v1/users/#{ERB::Util.url_encode(clerk_id)}",
      headers: { "Authorization" => "Bearer #{secret}" },
      timeout: 5
    )

    return nil unless response.success?

    data = response.parsed_response
    return nil unless data.is_a?(Hash) && data["email_addresses"].is_a?(Array)

    primary_email_id = data["primary_email_address_id"]
    addresses = data["email_addresses"].select { |address| address.is_a?(Hash) }
    email = addresses.find { |address| address["id"] == primary_email_id }&.dig("email_address")
    verified_emails = addresses.filter_map do |address|
      verification = address["verification"]
      address["email_address"].to_s.downcase if verification.is_a?(Hash) && verification["status"] == "verified"
    end

    {
      email: email,
      verified_emails: verified_emails,
      first_name: data["first_name"],
      last_name: data["last_name"]
    }
  rescue HTTParty::Error, Timeout::Error, SocketError, SystemCallError, IOError, OpenSSL::SSL::SSLError, JSON::ParserError => e
    Rails.logger.warn("Failed to fetch Clerk user: #{e.class}")
    nil
  end
end
