module AdminAuditable
  extend ActiveSupport::Concern

  private

  def record_admin_action!(action, record, changes: {}, metadata: {})
    AuditLog.record!(
      actor: current_user,
      action: action,
      auditable: record,
      changes: changes,
      metadata: metadata.merge(request_id: request.request_id)
    )
  rescue StandardError => e
    Rails.logger.error("Unable to write audit log: #{e.class}: #{e.message}")
  end
end
