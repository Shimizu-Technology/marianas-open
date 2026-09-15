module Commerce
  module Payments
    class ReconcilePaidOrder
      def self.call(order:, gateway: Payments.gateway)
        new(order:, gateway:).call
      end

      def initialize(order:, gateway:)
        @order = order
        @gateway = gateway
      end

      def call
        raise CheckoutError, "Only paid orders can be reconciled." unless order.paid?
        raise CheckoutError, "Order is missing its Stripe Checkout Session." if order.stripe_checkout_session_id.blank?

        session = gateway.retrieve_checkout_session(order.stripe_checkout_session_id)
        verify!(session)
        order.update!(last_reconciled_at: Time.current, payment_error: nil)
        order
      rescue StandardError => e
        order.update_columns(payment_error: e.message.to_s.first(2_000), updated_at: Time.current) if order&.persisted?
        raise
      end

      private

      attr_reader :order, :gateway

      def verify!(session)
        raise CheckoutError, "Stripe reports checkout is not complete." unless value(session, :status) == "complete"
        raise CheckoutError, "Stripe reports payment is not paid." unless value(session, :payment_status) == "paid"
        raise CheckoutError, "Stripe total does not match the order." unless value(session, :amount_total).to_i == order.total_cents
        raise CheckoutError, "Stripe currency does not match the order." unless value(session, :currency).to_s.upcase == order.currency
        return if expandable_id(value(session, :payment_intent)) == order.stripe_payment_intent_id

        raise CheckoutError, "Stripe payment reference does not match the order."
      end

      def value(object, key)
        object.respond_to?(:[]) ? (object[key.to_s] || object[key.to_sym]) : object.public_send(key)
      end

      def expandable_id(object)
        object.respond_to?(:id) ? object.id : object.to_s
      end
    end
  end
end
