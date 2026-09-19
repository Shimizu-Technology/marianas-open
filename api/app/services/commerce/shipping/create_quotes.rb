module Commerce
  module Shipping
    class CreateQuotes
      QUOTE_LIFETIME = 15.minutes
      TERRITORY_CODES = %w[AS FM GU MH MP PW PR VI].freeze
      def initialize(organization:, raw_lines:, raw_address:, gateway: Shipping.gateway)
        @organization = organization
        @raw_lines = raw_lines
        @address = Address.normalize(raw_address)
        @gateway = gateway
      end

      def call
        location = shipping_location!
        @cart = Cart.new(
          organization: @organization,
          raw_lines: @raw_lines,
          fulfillment_method: "shipping",
          inventory_location: location
        )
        if @cart.lines.any? { |line| line.variant.product.demo_only? != Configuration.poc_mode? }
          raise Error, "This item is not available in the current shop preview."
        end
        package = shipping_package!
        ensure_customs_ready!(location)
        response = @gateway.quote(
          from_address: symbolized_address(location.address),
          to_address: @address,
          parcel: parcel(package),
          customs_items: customs_required?(location) ? @cart.customs_items : []
        )
        rates = persist_rates!(response:, location:, package:)
        raise RateError, "No delivery services are available for that address." if rates.empty?

        {
          address: response.fetch(:address),
          messages: response.fetch(:messages, []),
          subtotal_cents: @cart.subtotal_cents,
          currency: @cart.currency,
          expires_at: rates.first.fetch(:expires_at),
          rates:
        }
      end

      private

      def shipping_location!
        @organization.inventory_locations.where(active: true, shipping_enabled: true).order(:id).first ||
          raise(ConfigurationError, "Deal Depot shipping has not been configured yet.")
      end

      def shipping_package!
        packages = @organization.shipping_packages.for_checkout
        packages.detect { |candidate| candidate.fits_weight?(@cart.contents_weight_grams) } ||
          raise(Error, "This order is too heavy for the available shipping packages. Please contact support.")
      end

      def symbolized_address(raw)
        Address.normalize(raw, require_delivery: false)
      end

      def parcel(package)
        {
          length: mm_to_inches(package.length_mm),
          width: mm_to_inches(package.width_mm),
          height: mm_to_inches(package.height_mm),
          weight: grams_to_ounces(@cart.contents_weight_grams + package.empty_weight_grams)
        }
      end

      def customs_required?(location)
        from = location.address.to_h
        from_country = from["country"].to_s.upcase
        from_state = from["state"].to_s.upcase
        from_country != @address[:country] ||
          TERRITORY_CODES.include?(from_state) || TERRITORY_CODES.include?(@address[:state])
      end

      def ensure_customs_ready!(location)
        return unless customs_required?(location)

        missing = @cart.lines.select { |line| line.variant.country_of_origin.blank? }
        return if missing.empty?

        names = missing.map { |line| line.variant.product.name }.uniq.join(", ")
        raise Error, "Add a country of origin to #{names} before quoting off-island delivery."
      end

      def persist_rates!(response:, location:, package:)
        expires_at = QUOTE_LIFETIME.from_now
        destination_digest = Address.digest(response.fetch(:address))
        ShippingQuote.transaction do
          response.fetch(:rates).filter_map do |rate|
            next unless rate.fetch(:currency).upcase == @cart.currency

            quote = @organization.shipping_quotes.create!(
              inventory_location: location,
              shipping_package: package,
              cart_digest: @cart.digest,
              destination_digest:,
              provider_shipment_id: response.fetch(:shipment_id),
              provider_rate_id: rate.fetch(:id),
              carrier: rate.fetch(:carrier),
              service: rate.fetch(:service),
              amount_cents: rate.fetch(:amount_cents),
              currency: rate.fetch(:currency).upcase,
              delivery_days: rate[:delivery_days],
              delivery_date: rate[:delivery_date],
              expires_at:
            )
            {
              token: quote.checkout_token,
              carrier: quote.carrier,
              service: quote.service,
              amount_cents: quote.amount_cents,
              currency: quote.currency,
              delivery_days: quote.delivery_days,
              delivery_date: quote.delivery_date,
              expires_at: quote.expires_at
            }
          end.sort_by { |rate| rate.fetch(:amount_cents) }.first(5)
        end
      end

      def mm_to_inches(mm)
        (mm / 25.4).round(1)
      end

      def grams_to_ounces(grams)
        (grams / 28.3495).round(1)
      end
    end
  end
end
