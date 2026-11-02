class AsjjfCalendarReview < ApplicationRecord
  belongs_to :snapshot, class_name: "AsjjfSnapshot"
  belongs_to :event, optional: true
  validates :kind, inclusion: { in: %w[new_draft change missing ambiguous] }
  validates :status, inclusion: { in: %w[pending applied dismissed superseded] }

  def decide!(action, actor:)
    Asjjf::CalendarWatcher.synchronize do
      reload
      raise ArgumentError, "This review has already changed. Refresh the calendar panel." unless status == "pending"
      if action == "apply"
        raise ArgumentError, "Open the draft or review this warning manually." unless kind == "change" && event
        latest = AsjjfSnapshot.where(page_type: "season_calendar", asjjf_id: snapshot.asjjf_id).order(fetched_at: :desc, id: :desc).first
        unless latest&.parse_status == "parsed" && latest.outcome == "ok" && AsjjfCalendarRun.exists?(snapshot_id: latest.id)
          raise ArgumentError, "The latest calendar check is incomplete. Wait for a successful check before applying."
        end
        event.with_lock do
          current = event.attributes.slice(*old_values.keys).as_json
          raise ArgumentError, "The event has changed. Wait for a fresh calendar check before applying." unless current == old_values
          event.audit_actor = actor
          event.audit_action = "asjjf_calendar_apply"
          event.audit_metadata = { snapshot_id: snapshot_id, old_values: old_values, new_values: new_values }
          event.update!(new_values)
        end
      elsif action != "dismiss"
        raise ArgumentError, "Choose apply or dismiss"
      end
      update!(status: action == "apply" ? "applied" : "dismissed", reviewed_at: Time.current)
    end
  end
end
