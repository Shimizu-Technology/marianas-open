module Commerce
  module Checkout
    class Create
      def initialize(organization:, attributes:, gateway: Payments.gateway)
        @organization = organization
        @attributes = attributes.to_h.deep_symbolize_keys
        @gateway = gateway
      end

      def call
        order = find_or_create_reserved_order!
        return checkout_payload(order) if order.paid? && order.stripe_checkout_url.present?
        if order.pending_payment? && order.payment_expires_at.future? && order.stripe_checkout_url.present?
          return checkout_payload(order)
        end
        ensure_retryable!(order)

        session = gateway.create_checkout_session(order:)
        persist_session!(order, session)
        checkout_payload(order)
      rescue Payments::Error => e
        if e.is_a?(Payments::CheckoutError) && order&.persisted? && order.pending_payment?
          Inventory::ReleaseOrder.call(order:, status: "payment_failed", error: e.message)
        end
        raise
      end

      private

      attr_reader :organization, :attributes, :gateway

      def find_or_create_reserved_order!
        existing = organization.orders.find_by(checkout_key: attributes[:checkout_key])
        if existing
          verify_order_environment!(existing)
          return existing
        end

        create_reserved_order!
      rescue ActiveRecord::RecordNotUnique
        existing = organization.orders.find_by!(checkout_key: attributes[:checkout_key])
        verify_order_environment!(existing)
        existing
      rescue ActiveRecord::RecordInvalid => e
        raise unless e.record.is_a?(Order) && e.record.errors.added?(:checkout_key, :taken)

        existing = organization.orders.find_by!(checkout_key: attributes[:checkout_key])
        verify_order_environment!(existing)
        existing
      end

      def verify_order_environment!(order)
        if order.order_items.includes(:product).any? { |item| item.product.demo_only? != Configuration.poc_mode? } ||
            order.simulated? != Payments.fake_checkout_enabled?
          raise Payments::CheckoutError, "This checkout belongs to a different shop environment. Start a new checkout."
        end
      end

      def ensure_retryable!(order)
        return if order.pending_payment? && order.payment_expires_at.future? && order.inventory_reservations.active.exists?

        if order.pending_payment? && !order.payment_expires_at.future?
          raise Payments::IndeterminateCheckoutError,
            "We’re confirming whether this checkout completed. Please wait a moment and try again."
        end

        raise Payments::CheckoutError, "That checkout attempt could not be resumed. Please try again."
      end

      def persist_session!(order, session)
        order.with_lock do
          return if order.stripe_checkout_url.present?

          order.update!(
            stripe_checkout_session_id: session.fetch(:id),
            stripe_checkout_url: session.fetch(:url)
          )
        end
      rescue KeyError, ActiveRecord::ActiveRecordError => e
        Rails.logger.error("Stripe Checkout Session could not be persisted for order #{order.number}: #{e.class}: #{e.message}")
        raise Payments::IndeterminateCheckoutError,
          "We could not confirm the payment page. Please wait a moment and try again."
      end

      def create_reserved_order!
        fulfillment_method = attributes[:fulfillment_method].to_s
        location, quote, address = fulfillment_details(fulfillment_method)
        cart = Shipping::Cart.new(
          organization:,
          raw_lines: attributes.fetch(:cart),
          fulfillment_method:,
          inventory_location: location
        )
        if cart.lines.any? { |line| line.variant.product.demo_only? != Configuration.poc_mode? }
          raise Shipping::Error, "This item is not available in the current shop preview."
        end
        verify_quote!(quote:, cart:, address:) if fulfillment_method == "shipping"
        contact = normalized_contact(address)
        expires_at = Payments::CHECKOUT_LIFETIME.from_now

        Order.transaction do
          lock_and_verify_products!(cart)
          order = organization.orders.create!(
            inventory_location: location,
            shipping_quote: quote,
            checkout_key: attributes.fetch(:checkout_key),
            simulated: Payments.fake_checkout_enabled?,
            fulfillment_method:,
            customer_name: contact.fetch(:name),
            customer_email: contact.fetch(:email),
            customer_phone: contact[:phone],
            shipping_address: fulfillment_method == "shipping" ? address.stringify_keys : {},
            currency: cart.currency,
            subtotal_cents: cart.subtotal_cents,
            shipping_cents: quote&.amount_cents.to_i,
            tax_cents: 0,
            total_cents: cart.subtotal_cents + quote&.amount_cents.to_i,
            shipping_carrier: quote&.carrier,
            shipping_service: quote&.service,
            payment_expires_at: expires_at
          )
          create_items!(order, cart)
          Inventory::ReserveOrder.call(order:, cart:)
          ReleaseExpiredOrderJob.set(wait_until: order.payment_expires_at + 5.minutes).perform_later(order.id)
          order
        end
      end

      def lock_and_verify_products!(cart)
        product_ids = cart.lines.map { |line| line.variant.product_id }.uniq.sort
        products = organization.products.where(id: product_ids).order(:id).lock.to_a
        return if products.length == product_ids.length &&
          products.all? { |product| product.active? && product.demo_only? == Configuration.poc_mode? }

        raise Shipping::Error, "This item is not available in the current shop preview."
      end

      def fulfillment_details(method)
        case method
        when "shipping"
          quote = ShippingQuote.find_checkout_token!(attributes.fetch(:shipping_quote_token))
          raise Shipping::Error, "That delivery rate has expired. Please refresh the rates." if quote.expired?
          raise Shipping::Error, "That delivery rate does not belong to this shop." unless quote.organization == organization

          [ quote.inventory_location, quote, Shipping::Address.normalize(attributes.fetch(:shipping_address)) ]
        when "pickup"
          location = organization.inventory_locations.find_by!(
            id: attributes.fetch(:pickup_location_id), active: true, pickup_enabled: true
          )
          [ location, nil, nil ]
        else
          raise Shipping::Error, "Choose delivery or Deal Depot pickup."
        end
      end

      def verify_quote!(quote:, cart:, address:)
        if quote.provider_shipment_id.start_with?("shp_dev_") != Shipping.fake_rates_enabled?
          raise Shipping::Error, "This delivery rate belongs to a different shop environment. Refresh the rates."
        end
        raise Shipping::Error, "Your bag changed. Please refresh the delivery rates." unless quote.cart_digest == cart.digest
        return if quote.destination_digest == Shipping::Address.digest(address)

        raise Shipping::AddressError, "Your address changed. Please refresh the delivery rates."
      end

      def normalized_contact(address)
        raw = address || attributes.fetch(:contact, {})
        contact = {
          name: raw[:name].to_s.strip,
          email: raw[:email].to_s.strip.downcase,
          phone: raw[:phone].to_s.strip.presence
        }
        missing = %i[name email].select { |key| contact[key].blank? }
        raise Shipping::Error, "Please complete #{missing.join(' and ')}." if missing.any?

        contact
      end

      def create_items!(order, cart)
        cart.lines.each do |line|
          variant = line.variant
          options = variant.product_variant_option_values.includes(product_option_value: :product_option).map do |selection|
            value = selection.product_option_value
            { name: value.product_option.name, value: value.value }
          end
          order.order_items.create!(
            product: variant.product,
            product_variant: variant,
            product_name: variant.product.name,
            variant_name: variant.name,
            sku: variant.sku,
            options_snapshot: options,
            unit_price_cents: variant.price_cents,
            quantity: line.quantity,
            line_total_cents: variant.price_cents * line.quantity,
            currency: variant.currency
          )
        end
      end

      def checkout_payload(order)
        {
          order_number: order.number,
          order_token: order.public_token,
          checkout_url: order.stripe_checkout_url,
          expires_at: order.payment_expires_at
        }
      end
    end
  end
end
