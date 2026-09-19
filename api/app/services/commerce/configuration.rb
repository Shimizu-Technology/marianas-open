module Commerce
  class Configuration
    TRUE_VALUES = %w[1 true yes on].freeze

    def self.enabled?
      TRUE_VALUES.include?(ENV.fetch("COMMERCE_ENABLED", "false").strip.downcase)
    end

    # The public proof of concept is deliberately confined to the staging deployment.
    # A test or live provider key must never silently replace its simulated gateways.
    def self.poc_mode?
      Rails.env.production? && ENV["COMMERCE_DEPLOYMENT_ENV"] == "staging" &&
        ENV["PUBLIC_FRONTEND_URL"] == "https://mo.shimizu-technology.com" &&
        ENV["COMMERCE_EMAIL_DELIVERY_MODE"] == "disabled" &&
        enabled? && TRUE_VALUES.include?(ENV.fetch("COMMERCE_POC_MODE", "false").strip.downcase)
    end
  end
end
