module Commerce
  module Payments
    CHECKOUT_LIFETIME = 45.minutes

    class Error < StandardError; end
    class ConfigurationError < Error; end
    class CheckoutError < Error; end
    class IndeterminateCheckoutError < Error; end
    class WebhookError < Error; end
    class RefundError < Error; end
    class IndeterminateRefundError < RefundError; end

    def self.fake_checkout_enabled?
      Configuration.poc_mode? ||
        (Rails.env.development? && ActiveModel::Type::Boolean.new.cast(ENV["STRIPE_FAKE_CHECKOUT"]))
    end

    def self.gateway
      if fake_checkout_enabled?
        DevelopmentGateway.new
      elsif ENV["STRIPE_API_KEY"].present?
        StripeGateway.new(api_key: ENV.fetch("STRIPE_API_KEY"))
      else
        raise ConfigurationError, "Secure payment is not configured yet. Please try again later."
      end
    end

    def self.provider_mode
      return "mock" if Configuration.poc_mode?
      return "test" if Rails.env.test? || fake_checkout_enabled?

      api_key = ENV.fetch("STRIPE_API_KEY", "")
      return "unconfigured" if api_key.blank?

      api_key.include?("_test_") ? "test" : "live"
    end

    def self.construct_stripe_event(payload:, signature:)
      secret = ENV["STRIPE_WEBHOOK_SECRET"]
      raise ConfigurationError, "Stripe webhook verification is not configured." if secret.blank?

      Stripe::Webhook.construct_event(payload, signature, secret)
    rescue JSON::ParserError, Stripe::SignatureVerificationError => e
      raise WebhookError, e.message
    end
  end
end
