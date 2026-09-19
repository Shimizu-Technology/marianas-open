class User < ApplicationRecord
  ROLES = %w[admin staff events_admin merchandise_admin fulfillment_staff viewer].freeze
  PERMISSIONS = %w[
    events_manage commerce_catalog_manage commerce_inventory_manage commerce_settings_manage
    commerce_orders_view commerce_fulfillment_manage commerce_refunds_manage
    commerce_reports_view commerce_launch_manage users_manage
  ].freeze
  ROLE_PERMISSIONS = {
    "admin" => PERMISSIONS,
    # Existing staff accounts predate commerce. Keep their original event scope.
    "staff" => %w[events_manage],
    "events_admin" => %w[events_manage],
    "merchandise_admin" => %w[
      commerce_catalog_manage commerce_inventory_manage commerce_settings_manage
      commerce_orders_view commerce_fulfillment_manage commerce_refunds_manage
      commerce_reports_view commerce_launch_manage
    ],
    "fulfillment_staff" => %w[commerce_orders_view commerce_inventory_manage commerce_fulfillment_manage],
    "viewer" => []
  }.freeze
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
    permissions.any?
  end

  def permissions
    ROLE_PERMISSIONS.fetch(role, [])
  end

  def can?(permission)
    permissions.include?(permission.to_s)
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
    [ first_name, last_name ].compact.join(" ").presence || email.split("@").first
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
