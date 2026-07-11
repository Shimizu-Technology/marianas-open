class AuditLog < ApplicationRecord
  belongs_to :actor, class_name: "User", optional: true

  validates :action, :auditable_type, presence: true

  scope :recent, -> { order(created_at: :desc) }

  def self.record!(actor:, action:, auditable:, changes: {}, metadata: {})
    create!(
      actor: actor,
      action: action,
      auditable_type: auditable.class.name,
      auditable_id: auditable.id,
      auditable_label: auditable.try(:name) || auditable.try(:title) || auditable.to_s,
      change_set: changes || {},
      metadata: metadata || {}
    )
  end

  def as_json(options = {})
    super(options.merge(except: [ :updated_at, :change_set ])).merge(
      "changes" => change_set,
      "actor" => actor&.as_json(only: [ :id, :email, :first_name, :last_name ])
    )
  end
end
