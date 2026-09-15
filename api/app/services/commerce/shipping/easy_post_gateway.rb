require "timeout"

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

      def purchase_label(shipment_id:, rate_id:)
        Timeout.timeout(15.seconds, LabelError, "EasyPost did not confirm the label purchase in time.") do
          shipment = @client.shipment.retrieve(shipment_id)
          shipment = @client.shipment.buy(shipment_id, rate: { id: rate_id }) unless purchased?(shipment)
          shipment_payload(shipment)
        end
      rescue EasyPost::Errors::EasyPostError => e
        raise LabelError, readable_error(e, "The shipping label could not be purchased.")
      end

      private

      def purchased?(shipment)
        shipment.tracking_code.present? && shipment.postage_label&.label_url.present?
      end

      def shipment_payload(shipment)
        rate = shipment.selected_rate
        tracker = shipment.tracker
        label = shipment.postage_label
        {
          mode: shipment.mode,
          status: shipment.status.presence || "purchased",
          tracking_code: shipment.tracking_code,
          tracking_url: tracker&.public_url,
          tracker_id: tracker&.id,
          label_url: label&.label_pdf_url.presence || label&.label_url,
          label_format: label&.label_file_type,
          postage_cents: rate&.rate.present? ? (BigDecimal(rate.rate.to_s) * 100).round.to_i : nil,
          currency: rate&.currency.to_s.upcase.presence || "USD"
        }
      end

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
