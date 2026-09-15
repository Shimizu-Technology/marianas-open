module Commerce
  module Refunds
    class Reconcile
      def self.call(refund:, gateway: Payments.gateway)
        payload = if refund.provider_refund_id.present?
          gateway.retrieve_refund(refund.provider_refund_id)
        else
          gateway.create_refund(refund:)
        end
        ApplyProviderResult.call(refund:, payload:)
      rescue Payments::RefundError => e
        refund.update!(status: "error", failure_reason: e.message.to_s.first(500))
        raise
      end
    end
  end
end
