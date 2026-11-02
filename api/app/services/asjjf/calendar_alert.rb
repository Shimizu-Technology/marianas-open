module Asjjf
  class CalendarAlert
    def self.deliver(run, reviews)
      return if reviews.empty?
      recipients = ENV.fetch("ASJJF_ALERT_EMAILS", "").split(",").map(&:strip).reject(&:blank?)
      from = ENV["RESEND_FROM_EMAIL"].presence || ENV["MAILER_FROM_EMAIL"].presence
      message = [ "ASJJF calendar check ##{run.id}: #{run.summary['new_drafts']} new drafts, #{run.summary['pending_changes']} changes or warnings, #{run.summary['updated_drafts'] || 0} updated drafts.",
        *reviews.map { |review| "#{review.title}: #{review.kind.humanize}" },
        "Review the ASJJF calendar panel in Events before publishing or applying changes.", run.snapshot.url ].join("\n")
      if recipients.empty? || ENV["RESEND_API_KEY"].blank? || from.blank?
        Rails.logger.warn("[ASJJF] #{message} Email alerts are not configured.")
        return
      end
      Resend::Emails.send({ from: from, to: recipients, subject: "ASJJF calendar: events need review", text: message })
    rescue StandardError => e
      Rails.logger.error("[ASJJF] Calendar alert failed: #{e.class}: #{e.message}")
    end
  end
end
