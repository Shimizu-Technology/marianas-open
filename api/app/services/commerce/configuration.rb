module Commerce
  class Configuration
    TRUE_VALUES = %w[1 true yes on].freeze

    def self.enabled?
      TRUE_VALUES.include?(ENV.fetch("COMMERCE_ENABLED", "false").strip.downcase)
    end
  end
end
