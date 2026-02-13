class User < ApplicationRecord
  ROLES = %w[admin staff viewer].freeze

  validates :clerk_id, presence: true, uniqueness: true
  validates :email, presence: true, uniqueness: { case_sensitive: false }
  validates :role, inclusion: { in: ROLES }

  def admin?
    role == "admin"
  end

  def staff?
    admin? || role == "staff"
  end

  def viewer?
    role == "viewer"
  end

  def is_admin
    admin?
  end

  def is_staff
    staff?
  end

  def full_name
    [first_name, last_name].compact.join(" ").presence || email.split("@").first
  end
end
