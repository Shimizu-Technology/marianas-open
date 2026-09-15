class CommerceLaunchCheck < ApplicationRecord
  STATUSES = %w[pending passed blocked].freeze

  belongs_to :organization
  belongs_to :reviewed_by, class_name: "User", optional: true

  validates :key, presence: true, uniqueness: { scope: :organization_id }
  validates :status, inclusion: { in: STATUSES }
  validates :note, length: { maximum: 2_000 }
  validates :note, presence: true, unless: -> { status == "pending" }
end
