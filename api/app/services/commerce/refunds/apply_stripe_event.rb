module Commerce
  module Refunds
    class ApplyStripeEvent
      def self.call(refund_object:, payment_event:)
        new(refund_object:, payment_event:).call
      end

      def initialize(refund_object:, payment_event:)
        @refund_object = refund_object
        @payment_event = payment_event
      end

      def call
        ensure_provider_mode!
        refund = find_or_import!
        payment_event.order = refund.order
        ApplyProviderResult.call(refund:, payload: provider_payload)
        payment_event.update!(status: "processed", processed_at: Time.current)
        refund
      end

      private

      attr_reader :refund_object, :payment_event

      def ensure_provider_mode!
        incoming_mode = value(:livemode) ? "live" : "test"
        return if incoming_mode == Payments.provider_mode

        raise InvalidRefund, "Stripe refund mode does not match this environment."
      end

      def find_or_import!
        provider_id = value(:id).to_s
        local_id = metadata_value(:order_refund_id)
        refund = OrderRefund.find_by(provider: "stripe", provider_refund_id: provider_id)
        refund ||= OrderRefund.find_by(id: local_id) if local_id.present?
        return refund if refund

        order = Order.find_by(stripe_payment_intent_id: expandable_id(value(:payment_intent)))
        raise InvalidRefund, "No order matches Stripe refund #{provider_id}." unless order

        order.order_refunds.create_or_find_by!(provider: "stripe", provider_refund_id: provider_id) do |record|
          record.assign_attributes(
            provider_mode: value(:livemode) ? "live" : "test",
            request_key: "stripe-event-#{provider_id}", source: "stripe_dashboard",
            status: "pending_provider", reason: normalized_reason, staff_note: "Created in Stripe Dashboard",
            amount_cents: value(:amount), currency: value(:currency).to_s.upcase,
            requested_at: provider_created_at
          )
        end
      end

      def provider_payload
        {
          id: value(:id), mode: value(:livemode) ? "live" : "test", status: value(:status), amount_cents: value(:amount),
          currency: value(:currency), payment_intent_id: expandable_id(value(:payment_intent)),
          balance_transaction_id: expandable_id(value(:balance_transaction)), failure_reason: value(:failure_reason)
        }
      end

      def normalized_reason
        reason = value(:reason).to_s
        OrderRefund::REASONS.include?(reason) ? reason : "requested_by_customer"
      end

      def provider_created_at
        created = value(:created)
        created.present? ? Time.zone.at(created.to_i) : Time.current
      end

      def metadata_value(key)
        metadata = value(:metadata)
        return unless metadata.respond_to?(:[])

        metadata[key.to_s] || metadata[key.to_sym]
      end

      def expandable_id(object)
        object.respond_to?(:id) ? object.id : object.to_s
      end

      def value(key)
        if refund_object.respond_to?(:[])
          refund_object[key.to_s] || refund_object[key.to_sym]
        elsif refund_object.respond_to?(key)
          refund_object.public_send(key)
        end
      end
    end
  end
end
