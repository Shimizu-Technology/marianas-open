module Commerce
  module Shipping
    class DevelopmentGateway
      def quote(from_address:, to_address:, parcel:, customs_items: [])
        country = to_address.fetch(:country, "US").upcase
        distance_surcharge = country == "US" ? 0 : 900
        weight_surcharge = [ (parcel.fetch(:weight).to_f - 16).ceil, 0 ].max * 35
        base = 995 + distance_surcharge + weight_surcharge
        shipment_id = "shp_dev_#{SecureRandom.hex(8)}"

        {
          address: to_address.transform_values { |value| value.to_s.strip }.merge(country: country),
          messages: [ "Development estimate — connect an EasyPost test key for carrier rates." ],
          shipment_id: shipment_id,
          rates: [
            rate(shipment_id, "USPS", "Priority", base, 4),
            rate(shipment_id, "USPS", "PriorityExpress", base + 1_850, 2)
          ]
        }
      end

      def purchase_label(shipment_id:, rate_id:)
        digest = Digest::SHA256.hexdigest("#{shipment_id}:#{rate_id}").first(20)
        {
          mode: "test",
          status: "pre_transit",
          tracking_code: "EZ#{digest.upcase}",
          tracking_url: "https://track.easypost.test/#{digest}",
          tracker_id: "trk_dev_#{digest}",
          label_url: "https://labels.easypost.test/#{digest}.png",
          label_format: "image/png",
          postage_cents: nil,
          currency: "USD"
        }
      end

      private

      def rate(shipment_id, carrier, service, amount_cents, delivery_days)
        {
          id: "rate_dev_#{Digest::SHA256.hexdigest("#{shipment_id}:#{service}").first(16)}",
          carrier: carrier,
          service: service,
          amount_cents: amount_cents,
          currency: "USD",
          delivery_days: delivery_days,
          delivery_date: delivery_days.days.from_now.iso8601
        }
      end
    end
  end
end
