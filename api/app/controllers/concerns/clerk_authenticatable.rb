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
        user.update(clerk_id: clerk_id, first_name: first_name, last_name: last_name)
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
end
