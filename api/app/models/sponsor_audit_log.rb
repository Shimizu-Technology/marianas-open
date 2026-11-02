class SponsorAuditLog < ApplicationRecord
  belongs_to :sponsor, optional: true
  belongs_to :actor, class_name: "User", optional: true
  validates :sponsor_name, :actor_name, :action, presence: true
end
