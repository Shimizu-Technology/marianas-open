class EventAuditEntry < ApplicationRecord
  belongs_to :event
  belongs_to :actor, class_name: "User", optional: true
  validates :action, :actor_name, presence: true

  def as_json(options = {})
    super(options.merge(only: %i[id actor_name action from_status to_status reason metadata created_at]))
  end
end
