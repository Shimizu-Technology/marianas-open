class EventAsjjfSource < ApplicationRecord
  belongs_to :event
  validates :asjjf_event_id, numericality: { only_integer: true, greater_than: 0 }, uniqueness: { scope: :event_id }
  validates :discipline, inclusion: { in: %w[gi nogi unknown] }
  validates :derived_from, inclusion: { in: %w[registration_url asjjf_event_ids admin] }
end
