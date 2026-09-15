module Commerce
  module Refunds
    class ApplyProviderResult
      TERMINAL_STATUSES = %w[succeeded failed canceled].freeze

      def self.call(refund:, payload:)
        new(refund:, payload:).call
      end

      def initialize(refund:, payload:)
        @refund = refund
        @payload = payload
      end

      def call
        notification = nil
        refund.with_lock do
          verify!
          status = normalized_status
          return refund if terminal_regression?(status)

          first_success = refund.status != "succeeded" && status == "succeeded"
          refund.update!(
            provider_refund_id: payload.fetch(:id), status:,
            provider_balance_transaction_id: payload[:balance_transaction_id],
            failure_reason: payload[:failure_reason],
            processed_at: TERMINAL_STATUSES.include?(status) ? Time.current : nil
          )
          notification = Notifications::QueueRefund.call(refund:).first if first_success
        end
        DeliverOrderNotificationJob.perform_later(notification.id) if notification
        refund
      end

      private

      attr_reader :refund, :payload

      def normalized_status
        value = payload.fetch(:status).to_s
        OrderRefund::STATUSES.include?(value) && value != "pending_provider" ? value : "pending"
      end

      def terminal_regression?(new_status)
        TERMINAL_STATUSES.include?(refund.status) && refund.status != new_status
      end

      def verify!
        if refund.provider_refund_id.present? && payload.fetch(:id).to_s != refund.provider_refund_id
          raise InvalidRefund, "Stripe refund reference does not match the local refund."
        end
        if payload[:mode].present? && payload[:mode].to_s != refund.provider_mode
          raise InvalidRefund, "Stripe refund mode does not match the order environment."
        end
        raise InvalidRefund, "Stripe refund amount does not match the request." unless payload.fetch(:amount_cents).to_i == refund.amount_cents
        raise InvalidRefund, "Stripe refund currency does not match the order." unless payload.fetch(:currency).to_s.upcase == refund.currency
        return if payload.fetch(:payment_intent_id).to_s == refund.order.stripe_payment_intent_id

        raise InvalidRefund, "Stripe refund payment does not match the order."
      end
    end
  end
end
