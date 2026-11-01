class EventPublishingService
  class NotReady < StandardError
    attr_reader :readiness
    def initialize(readiness)
      @readiness = readiness
      super("Complete the publishing checklist before publishing")
    end
  end
  class ForbiddenOverride < StandardError; end

  def self.call(event:, actor:, attributes: {}, action: nil, override_reason: nil)
    raise ArgumentError, "Override reason must be text" unless override_reason.nil? || override_reason.is_a?(String)
    Event.transaction do
      event.lock! if event.persisted?
      old_status = event.status
      event.assign_attributes(attributes)
      event.status = "draft" if event.status.blank?
      publishing = Event::PUBLIC_STATUSES.include?(event.status) && (event.new_record? || old_status != event.status || action == "publish")
      readiness = EventReadiness.new(event).call if publishing
      if publishing && !readiness[:publishable]
        raise ForbiddenOverride, "Only administrators can override publishing checks" if override_reason.present? && !actor.admin?
        raise NotReady, readiness if override_reason.to_s.strip.blank?
        raise ArgumentError, "Override reason must be between 10 and 2000 characters" unless (10..2000).cover?(override_reason.strip.length)
      end
      event.audit_actor = actor
      event.audit_action = action
      event.audit_reason = publishing && !readiness[:publishable] ? override_reason.strip : nil
      event.audit_metadata = publishing ? { readiness: readiness, overridden: !readiness[:publishable] } : {}
      event.save!
      event
    end
  end
end
