module Commerce
  module Payments
    class StripeGateway
      API_VERSION = "2026-07-29.dahlia"

      def initialize(api_key:, client: nil)
        @client = client || Stripe::StripeClient.new(api_key, stripe_version: API_VERSION)
      end

      def create_checkout_session(order:)
        session = @client.v1.checkout.sessions.create(
          checkout_attributes(order),
          { idempotency_key: "commerce-order-#{order.id}" }
        )
        { id: session.id, url: session.url }
      rescue Stripe::APIConnectionError => e
        raise IndeterminateCheckoutError, readable_error(e)
      rescue Stripe::StripeError => e
        raise CheckoutError, readable_error(e)
      end

      def retrieve_checkout_session(id)
        @client.v1.checkout.sessions.retrieve(id, {})
      rescue Stripe::APIConnectionError => e
        raise IndeterminateCheckoutError, readable_error(e)
      rescue Stripe::StripeError => e
        raise CheckoutError, readable_error(e)
      end

      private

      def checkout_attributes(order)
        {
          mode: "payment",
          integration_identifier: integration_identifier(order),
          client_reference_id: order.number,
          customer_email: order.customer_email,
          expires_at: order.payment_expires_at.to_i,
          success_url: "#{frontend_url}/shop/orders/#{order.public_token}?session_id={CHECKOUT_SESSION_ID}",
          cancel_url: "#{frontend_url}/shop/orders/#{order.public_token}?payment=cancelled",
          line_items: line_items(order),
          metadata: { order_id: order.id.to_s, order_number: order.number }
        }
      end

      def line_items(order)
        items = order.order_items.order(:id).map do |item|
          {
            price_data: {
              currency: item.currency.downcase,
              unit_amount: item.unit_price_cents,
              product_data: {
                name: item.product_name,
                description: item.variant_name
              }
            },
            quantity: item.quantity
          }
        end
        if order.shipping_cents.positive?
          items << {
            price_data: {
              currency: order.currency.downcase,
              unit_amount: order.shipping_cents,
              product_data: { name: "#{order.shipping_carrier} #{order.shipping_service} delivery" }
            },
            quantity: 1
          }
        end
        if order.tax_cents.positive?
          items << {
            price_data: {
              currency: order.currency.downcase,
              unit_amount: order.tax_cents,
              product_data: { name: "Tax" }
            },
            quantity: 1
          }
        end
        items
      end

      def frontend_url
        ENV.fetch("PUBLIC_FRONTEND_URL", "http://localhost:5173").delete_suffix("/")
      end

      def integration_identifier(order)
        digest = Digest::SHA256.digest(order.checkout_key)
        suffix = digest.bytes.first(8).map { |byte| ("a".ord + (byte % 26)).chr }.join
        "marianas_open_#{suffix}"
      end

      def readable_error(error)
        error.message.to_s.strip.presence || "Stripe Checkout is temporarily unavailable."
      end
    end
  end
end
