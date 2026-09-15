module Commerce
  module Refunds
    class Create
      UUID_PATTERN = /\A[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\z/i

      def self.call(order:, amount_cents:, reason:, staff_note:, actor:, request_key:, gateway: Payments.gateway)
        new(order:, amount_cents:, reason:, staff_note:, actor:, request_key:, gateway:).call
      end

      def initialize(order:, amount_cents:, reason:, staff_note:, actor:, request_key:, gateway:)
        @order = order
        @amount_cents = Integer(amount_cents)
        @reason = reason.to_s
        @staff_note = staff_note.to_s.strip
        @actor = actor
        @request_key = request_key.to_s
        @gateway = gateway
      rescue ArgumentError, TypeError
        raise InvalidRefund, "Enter a valid refund amount."
      end

      def call
        refund = prepare
        return refund if %w[pending requires_action succeeded].include?(refund.status)

        payload = gateway.create_refund(refund:)
        ApplyProviderResult.call(refund:, payload:)
      rescue Payments::RefundError => e
        refund&.update!(status: "error", failure_reason: e.message.to_s.first(500))
        raise
      end

      private

      attr_reader :order, :amount_cents, :reason, :staff_note, :actor, :request_key, :gateway

      def prepare
        OrderRefund.transaction do
          order.lock!
          existing = order.order_refunds.find_by(request_key:)
          return verify_retry!(existing) if existing

          validate!
          order.order_refunds.create!(
            requested_by: actor, provider_mode: Payments.provider_mode, request_key:, source: "admin",
            status: "pending_provider", reason:, staff_note:, amount_cents:, currency: order.currency,
            requested_at: Time.current
          )
        end
      end

      def verify_retry!(refund)
        unless refund.amount_cents == amount_cents && refund.reason == reason && refund.staff_note.to_s == staff_note
          raise InvalidRefund, "That refund request key was already used with different details."
        end

        refund
      end

      def validate!
        raise InvalidRefund, "Only paid orders can be refunded." unless order.paid?
        raise InvalidRefund, "This order is missing its Stripe payment reference." if order.stripe_payment_intent_id.blank?
        raise InvalidRefund, "Choose a valid refund reason." unless OrderRefund::REASONS.include?(reason)
        raise InvalidRefund, "Add an internal note explaining this refund." if staff_note.length < 3
        raise InvalidRefund, "Use a new refund request key." unless request_key.match?(UUID_PATTERN)
        raise InvalidRefund, "Refund amount must be greater than zero." unless amount_cents.positive?
        return if amount_cents <= order.refundable_cents

        raise InvalidRefund, "Refund amount exceeds the remaining refundable balance."
      end
    end
  end
end
