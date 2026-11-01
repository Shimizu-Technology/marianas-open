class IdentityReview < ApplicationRecord
  belongs_to :candidate_academy, class_name: "Academy", optional: true
  belongs_to :resolved_academy, class_name: "Academy", optional: true
  validates :raw_name, :normalized_name, presence: true
  validates :status, inclusion: { in: %w[pending resolved] }
end
