module Commerce
  module Shipping
    class EasyPostGateway
      def initialize(api_key:)
        @client = EasyPost::Client.new(api_key: api_key)
      end

      def quote(from_address:, to_address:, parcel:, customs_items: [])
        verified = verify_address(to_address)
        shipment_attributes = {
          from_address: from_address,
          to_address: verified,
          parcel: parcel
        }
        shipment_attributes[:customs_info] = customs_info(customs_items) if customs_items.any?
        shipment = @client.shipment.create(shipment_attributes)

        {
          address: address_payload(verified),
          messages: verification_messages(verified),
          shipment_id: shipment.id,
          rates: shipment.rates.map { |rate| rate_payload(rate) }
        }
      rescue EasyPost::Errors::EasyPostError => e
        raise RateError, readable_error(e, "Shipping rates are temporarily unavailable.")
      end

      private

      def verify_address(address)
        @client.address.create(address.merge(verify: true))
      rescue EasyPost::Errors::EasyPostError => e
        raise AddressError, readable_error(e, "We could not verify that delivery address.")
      end

      def customs_info(items)
        {
          customs_certify: true,
          customs_signer: "Marianas Open",
          contents_type: "merchandise",
          customs_items: items
        }
      end

      def address_payload(address)
        %i[name company street1 street2 city state zip country phone email].to_h do |key|
          [ key, address.public_send(key) ]
        end.compact
      end

      def verification_messages(address)
        verification = address.verifications&.delivery
        Array(verification&.errors).filter_map { |error| error.respond_to?(:message) ? error.message : error.to_s }
      end

      def rate_payload(rate)
        {
          id: rate.id,
          carrier: rate.carrier,
          service: rate.service,
          amount_cents: (BigDecimal(rate.rate.to_s) * 100).round.to_i,
          currency: rate.currency.to_s.upcase,
          delivery_days: rate.delivery_days,
          delivery_date: rate.delivery_date
        }
      end

      def readable_error(error, fallback)
        message = error.message.to_s.strip
        message.present? ? message : fallback
      end
    end
  end
end
