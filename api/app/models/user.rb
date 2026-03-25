class User < ApplicationRecord
  ROLES = %w[admin staff viewer].freeze
  INVITATION_STATUSES = %w[pending accepted expired revoked].freeze

  belongs_to :invited_by, class_name: "User", optional: true

  validates :clerk_id, presence: true, uniqueness: true
  validates :email, presence: true, uniqueness: { case_sensitive: false }
  validates :role, inclusion: { in: ROLES }
  validates :invitation_status, inclusion: { in: INVITATION_STATUSES }

  scope :invitation_pending, -> { where(invitation_status: "pending") }

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

  def invitation_pending?
    invitation_status == "pending"
  end

  def invitation_accepted?
    invitation_status == "accepted"
  end

  def mark_invitation_accepted!
    update!(invitation_status: "accepted")
  end
end
