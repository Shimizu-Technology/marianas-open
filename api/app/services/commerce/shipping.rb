module Commerce
  module Shipping
    class Error < StandardError; end
    class ConfigurationError < Error; end
    class AddressError < Error; end
    class RateError < Error; end
    class LabelError < Error; end

    def self.gateway
      if ENV["EASYPOST_API_KEY"].present?
        EasyPostGateway.new(api_key: ENV.fetch("EASYPOST_API_KEY"))
      elsif Rails.env.development? && ActiveModel::Type::Boolean.new.cast(ENV["EASYPOST_FAKE_RATES"])
        DevelopmentGateway.new
      else
        raise ConfigurationError, "Shipping rates are not configured yet. Please choose Deal Depot pickup or try again later."
      end
    end

    def self.provider_mode
      return "test" if Rails.env.development? && ActiveModel::Type::Boolean.new.cast(ENV["EASYPOST_FAKE_RATES"])

      api_key = ENV.fetch("EASYPOST_API_KEY", "")
      return "unconfigured" if api_key.blank?

      api_key.start_with?("EZTK") ? "test" : "production"
    end
  end
end
