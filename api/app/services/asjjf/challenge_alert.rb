module Asjjf
  class ChallengeAlert
    def self.deliver(snapshot)
      recipients = ENV.fetch("ASJJF_ALERT_EMAILS", "").split(",").map(&:strip).reject(&:blank?)
      from = ENV["RESEND_FROM_EMAIL"].presence || ENV["MAILER_FROM_EMAIL"].presence
      message = "ASJJF returned a challenge for #{snapshot.url}. Fetching is paused until #{AsjjfSetting.breaker.paused_until.iso8601}. Review the ASJJF sync panel before resuming."
      if recipients.empty? || ENV["RESEND_API_KEY"].blank? || from.blank?
        Rails.logger.warn("[ASJJF] #{message} Email alerts are not configured.")
        return
      end
      Resend::Emails.send({ from: from, to: recipients, subject: "ASJJF fetching paused", text: message })
    rescue StandardError => e
      Rails.logger.error("[ASJJF] Challenge alert failed: #{e.class}: #{e.message}")
    end
  end
end
