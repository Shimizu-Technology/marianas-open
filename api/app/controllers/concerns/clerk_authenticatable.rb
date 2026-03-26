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

    if email.blank? && clerk_id.present?
      clerk_user = fetch_clerk_user(clerk_id)
      if clerk_user
        email = clerk_user[:email]
        first_name ||= clerk_user[:first_name]
        last_name ||= clerk_user[:last_name]
      end
    end

    @current_user = find_or_create_user(
      clerk_id: clerk_id,
      email: email,
      first_name: first_name,
      last_name: last_name
    )

    unless @current_user
      render_unauthorized("User not found. Contact an administrator for access.")
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

    # Find by email (invited user signing in for first time)
    if email.present?
      user = User.find_by("LOWER(email) = ?", email.downcase)

      if user
        attrs = { clerk_id: clerk_id }
        attrs[:first_name] = first_name if first_name.present?
        attrs[:last_name] = last_name if last_name.present?
        attrs[:invitation_status] = "accepted" if user.invitation_pending?
        user.update(attrs)
        return user
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

  def fetch_clerk_user(clerk_id)
    secret = ENV["CLERK_SECRET_KEY"]
    return nil if secret.blank?

    response = HTTParty.get(
      "https://api.clerk.com/v1/users/#{clerk_id}",
      headers: { "Authorization" => "Bearer #{secret}" },
      timeout: 5
    )

    return nil unless response.success?

    data = response.parsed_response
    primary_email_id = data["primary_email_address_id"]
    email = data.dig("email_addresses")&.find { |e| e["id"] == primary_email_id }&.dig("email_address")

    {
      email: email,
      first_name: data["first_name"],
      last_name: data["last_name"]
    }
  rescue HTTParty::Error, Timeout::Error => e
    Rails.logger.warn("Failed to fetch Clerk user #{clerk_id}: #{e.message}")
    nil
  end
end
