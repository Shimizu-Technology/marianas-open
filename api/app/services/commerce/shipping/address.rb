module Commerce
  module Shipping
    class Address
      KEYS = %i[name company street1 street2 city state zip country phone email].freeze
      REQUIRED_KEYS = %i[name street1 city state zip country].freeze

      def self.normalize(raw, require_delivery: true)
        address = raw.to_h.symbolize_keys.slice(*KEYS)
          .transform_values { |value| value.to_s.strip.presence }
          .compact
        address[:country] = address.fetch(:country, "US").upcase
        address[:state] = address[:state].to_s.upcase

        if require_delivery
          missing = REQUIRED_KEYS.select { |key| address[key].blank? }
          if missing.any?
            raise AddressError, "Please complete #{missing.map { |key| key.to_s.humanize.downcase }.join(', ')}."
          end
        end

        address
      end

      def self.digest(raw)
        canonical = normalize(raw).sort.to_h
        Digest::SHA256.hexdigest(canonical.to_json)
      end
    end
  end
end
