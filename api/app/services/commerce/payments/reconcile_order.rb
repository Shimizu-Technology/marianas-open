module Commerce
  module Payments
    class ReconcileOrder
      def self.call(order:, gateway: Payments.gateway)
        new(order:, gateway:).call
      end

      def initialize(order:, gateway:)
        @order = order
        @gateway = gateway
      end

      def call
        order.reload
        return order unless order.pending_payment?
        return release_order if order.stripe_checkout_session_id.blank? || development_session?

        session = gateway.retrieve_checkout_session(order.stripe_checkout_session_id)
        if value(session, :payment_status) == "paid"
          verify_payment!(session)
          Inventory::CaptureOrder.call(order:, payment_intent_id: payment_intent_id(session))
        elsif value(session, :status) == "expired"
          release_order
        else
          raise IndeterminateCheckoutError,
            "Stripe still considers checkout #{order.number} open; inventory remains reserved."
        end
      end

      private

      attr_reader :order, :gateway

      def development_session?
        order.stripe_checkout_session_id.start_with?("cs_test_dev_")
      end

      def release_order
        Inventory::ReleaseOrder.call(order:, status: "expired")
      end

      def verify_payment!(session)
        amount = value(session, :amount_total).to_i
        currency = value(session, :currency).to_s.upcase
        raise CheckoutError, "Stripe total does not match order #{order.number}" unless amount == order.total_cents
        raise CheckoutError, "Stripe currency does not match order #{order.number}" unless currency == order.currency
      end

      def payment_intent_id(session)
        payment_intent = value(session, :payment_intent)
        payment_intent.respond_to?(:id) ? payment_intent.id : payment_intent.to_s
      end

      def value(object, key)
        return if object.nil?

        if object.respond_to?(:[])
          object[key.to_s] || object[key.to_sym]
        elsif object.respond_to?(key)
          object.public_send(key)
        end
      end
    end
  end
end
