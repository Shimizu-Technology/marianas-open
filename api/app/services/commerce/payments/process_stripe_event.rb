module Commerce
  module Payments
    class ProcessStripeEvent
      PROCESSING_TIMEOUT = 5.minutes
      COMPLETED_EVENTS = %w[checkout.session.completed checkout.session.async_payment_succeeded].freeze
      RELEASE_EVENTS = {
        "checkout.session.expired" => "expired",
        "checkout.session.async_payment_failed" => "payment_failed"
      }.freeze

      def self.call(event:)
        new(event:).call
      end

      def initialize(event:)
        @event = event
      end

      def call
        payment_event = find_or_create_event!
        payment_event.with_lock do
          return payment_event if %w[processed ignored].include?(payment_event.status)
          return payment_event if payment_event.status == "processing" && payment_event.updated_at > PROCESSING_TIMEOUT.ago

          payment_event.update!(status: "processing", processing_error: nil)
          process!(payment_event)
        end
        payment_event
      rescue StandardError => e
        payment_event&.update_columns(status: "failed", processing_error: e.message, updated_at: Time.current)
        raise
      end

      private

      attr_reader :event

      def find_or_create_event!
        PaymentEvent.create!(
          provider: "stripe",
          provider_event_id: value(event, :id),
          event_type: value(event, :type),
          status: "received"
        )
      rescue ActiveRecord::RecordNotUnique
        PaymentEvent.find_by!(provider: "stripe", provider_event_id: value(event, :id))
      rescue ActiveRecord::RecordInvalid
        existing = PaymentEvent.find_by(provider: "stripe", provider_event_id: value(event, :id))
        raise unless existing

        existing
      end

      def process!(payment_event)
        event_type = value(event, :type)
        unless COMPLETED_EVENTS.include?(event_type) || RELEASE_EVENTS.key?(event_type)
          payment_event.update!(status: "ignored", processed_at: Time.current)
          return
        end

        session = value(value(event, :data), :object)
        order = find_order(session)
        payment_event.order = order

        if COMPLETED_EVENTS.include?(event_type)
          verify_payment!(order, session)
          if value(session, :payment_status) == "paid"
            Inventory::CaptureOrder.call(order:, payment_intent_id: payment_intent_id(session))
            payment_event.status = "processed"
          else
            payment_event.status = "ignored"
          end
        elsif RELEASE_EVENTS.key?(event_type)
          Inventory::ReleaseOrder.call(order:, status: RELEASE_EVENTS.fetch(event_type))
          payment_event.status = "processed"
        end

        payment_event.processed_at = Time.current
        payment_event.save!
      end

      def find_order(session)
        session_id = value(session, :id)
        metadata = value(session, :metadata)
        order_id = value(metadata, :order_id)
        order = Order.find_by(stripe_checkout_session_id: session_id) || Order.find_by(id: order_id)
        raise "No order matches Stripe Checkout Session #{session_id}" unless order

        if order.stripe_checkout_session_id.blank?
          order.update!(stripe_checkout_session_id: session_id)
        elsif order.stripe_checkout_session_id != session_id
          raise "Stripe Checkout Session does not match order #{order.number}"
        end
        order
      end

      def verify_payment!(order, session)
        amount = value(session, :amount_total).to_i
        currency = value(session, :currency).to_s.upcase
        raise "Stripe total does not match order #{order.number}" unless amount == order.total_cents
        raise "Stripe currency does not match order #{order.number}" unless currency == order.currency
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
