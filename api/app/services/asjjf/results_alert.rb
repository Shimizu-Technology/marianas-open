module Asjjf
  class ResultsAlert
    def self.deliver(run)
      recipients = ENV.fetch("ASJJF_ALERT_EMAILS", "").split(",").map(&:strip).reject(&:blank?)
      from = ENV["RESEND_FROM_EMAIL"].presence || ENV["MAILER_FROM_EMAIL"].presence
      message = [ "#{run.event.name}: results sync #{run.status} (run ##{run.id}).",
        *Array(run.diff_summary["messages"]), *Array(run.guard_failures), run.error,
        "Review event results in the admin panel." ].compact.join("\n")
      if recipients.empty? || ENV["RESEND_API_KEY"].blank? || from.blank?
        Rails.logger.warn("[ASJJF] #{message} Email alerts are not configured.")
        return
      end
      Resend::Emails.send({ from: from, to: recipients, subject: "ASJJF results #{run.status}: #{run.event.name}", text: message })
    rescue StandardError => e
      Rails.logger.error("[ASJJF] Results alert failed: #{e.class}: #{e.message}")
    end
  end
end
