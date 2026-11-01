class ResultsSyncRun < ApplicationRecord
  belongs_to :event
  belongs_to :approved_by, class_name: "User", optional: true
  validates :trigger, inclusion: { in: %w[scheduled manual snapshot] }
  validates :status, inclusion: { in: %w[incomplete no_changes applied held failed] }
end
