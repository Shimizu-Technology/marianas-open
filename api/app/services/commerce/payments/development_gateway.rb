module Commerce
  module Payments
    class DevelopmentGateway
      def create_checkout_session(order:)
        {
          id: "cs_test_dev_#{SecureRandom.hex(12)}",
          url: "/shop/orders/#{order.public_token}?test_checkout=1"
        }
      end

      def retrieve_checkout_session(id)
        order = Order.find_by!(stripe_checkout_session_id: id)
        {
          id:, status: "complete", payment_status: "paid", amount_total: order.total_cents,
          currency: order.currency.downcase, payment_intent: order.stripe_payment_intent_id
        }
      end

      def create_refund(refund:)
        {
          id: "re_test_dev_#{refund.id}", mode: refund.provider_mode, status: "succeeded", amount_cents: refund.amount_cents,
          currency: refund.currency, payment_intent_id: refund.order.stripe_payment_intent_id,
          balance_transaction_id: "txn_test_dev_#{refund.id}", failure_reason: nil
        }
      end

      def retrieve_refund(id)
        refund = OrderRefund.find_by!(provider_refund_id: id)
        create_refund(refund:)
      end
    end
  end
end
