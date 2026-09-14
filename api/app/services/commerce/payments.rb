module Commerce
  module Payments
    CHECKOUT_LIFETIME = 45.minutes

    class Error < StandardError; end
    class ConfigurationError < Error; end
    class CheckoutError < Error; end
    class IndeterminateCheckoutError < Error; end
    class WebhookError < Error; end

    def self.gateway
      if ENV["STRIPE_API_KEY"].present?
        StripeGateway.new(api_key: ENV.fetch("STRIPE_API_KEY"))
      elsif Rails.env.development? && ActiveModel::Type::Boolean.new.cast(ENV["STRIPE_FAKE_CHECKOUT"])
        DevelopmentGateway.new
      else
        raise ConfigurationError, "Secure payment is not configured yet. Please try again later."
      end
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
