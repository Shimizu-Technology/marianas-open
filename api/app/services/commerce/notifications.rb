module Commerce
  module Notifications
    DELIVERY_MODES = %w[disabled sandbox live].freeze
    SAFE_SANDBOX_RECIPIENT = /\A(?:delivered|bounced|complained)(?:\+[a-z0-9._-]+)?@resend\.dev\z/i

    class Error < StandardError; end
    class ConfigurationError < Error; end
    class DeliveryError < Error; end

    def self.delivery_mode
      mode = ENV.fetch("COMMERCE_EMAIL_DELIVERY_MODE", "disabled").to_s.downcase
      return mode if DELIVERY_MODES.include?(mode)

      raise ConfigurationError, "Commerce email delivery mode must be disabled, sandbox, or live."
    end

    def self.sandbox_recipient
      recipient = ENV.fetch("COMMERCE_EMAIL_SANDBOX_TO", "delivered+marianas-open@resend.dev").strip
      return recipient if recipient.match?(SAFE_SANDBOX_RECIPIENT)

      raise ConfigurationError, "Commerce sandbox email must use an approved resend.dev test address."
    end

    def self.gateway
      api_key = ENV["RESEND_API_KEY"].presence
      from = ENV["RESEND_FROM_EMAIL"].presence || ENV["MAILER_FROM_EMAIL"].presence
      raise ConfigurationError, "Resend is not configured for commerce notifications." if api_key.blank? || from.blank?

      ResendGateway.new(api_key:, from:)
    end
  end
end
