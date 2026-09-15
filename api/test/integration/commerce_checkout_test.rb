require "test_helper"
require "openssl"

class CommerceCheckoutTest < ActionDispatch::IntegrationTest
  include ActiveJob::TestHelper

  class FakeStripeGateway
    attr_reader :orders

    def initialize(status: "expired", payment_status: "unpaid", amount_total: nil, currency: nil)
      @orders = []
      @status = status
      @payment_status = payment_status
      @amount_total = amount_total
      @currency = currency
    end

    def create_checkout_session(order:)
      orders << order
      {
        id: "cs_test_#{order.id}",
        url: "https://checkout.stripe.test/#{order.number}"
      }
    end

    def retrieve_checkout_session(id)
      order = Order.find_by!(stripe_checkout_session_id: id)
      Struct.new(:status, :payment_status, :amount_total, :currency, :payment_intent).new(
        @status,
        @payment_status,
        @amount_total || order.total_cents,
        @currency || order.currency.downcase,
        "pi_reconciled_test"
      )
    end
  end

  class FailingStripeGateway
    def create_checkout_session(order:)
      raise Commerce::Payments::CheckoutError, "Stripe test failure for #{order.number}"
    end
  end

  class FlakyStripeGateway
    attr_reader :calls

    def initialize
      @calls = 0
    end

    def create_checkout_session(order:)
      @calls += 1
      if calls == 1
        raise Commerce::Payments::IndeterminateCheckoutError,
          "We could not confirm the payment page. Please wait a moment and try again."
      end

      { id: "cs_test_retry_#{order.id}", url: "https://checkout.stripe.test/retry/#{order.number}" }
    end
  end

  setup do
    @organization = Organization.create!(name: "Marianas Open", slug: "marianas-open")
    @location = @organization.inventory_locations.create!(
      name: "Deal Depot", code: "DEAL-DEPOT", pickup_enabled: true, shipping_enabled: true,
      pickup_instructions: "Wait for the ready email.", phone: "671-555-0100",
      address: { street1: "123 Marine Corps Drive", city: "Tamuning", state: "GU", zip: "96913", country: "US" }
    )
    package = @organization.shipping_packages.create!(
      name: "Apparel box", length_mm: 305, width_mm: 229, height_mm: 76,
      empty_weight_grams: 150, max_weight_grams: 4_500
    )
    @product = @organization.products.create!(
      name: "Official towel", slug: "official-towel", active: true, shippable: true, pickup_enabled: true
    )
    @variant = @product.product_variants.create!(
      name: "Standard", sku: "TOWEL-STANDARD", price_cents: 3_500, active: true,
      allow_shipping: true, allow_pickup: true, weight_grams: 500,
      customs_description: "Cotton sports towel", country_of_origin: "US"
    )
    @level = @variant.inventory_levels.create!(inventory_location: @location, on_hand: 8)
    cart = Commerce::Shipping::Cart.new(
      organization: @organization,
      raw_lines: [ { variant_id: @variant.id, quantity: 2 } ],
      fulfillment_method: "shipping",
      inventory_location: @location
    )
    @address = {
      name: "Test Customer", street1: "1600 Pennsylvania Avenue NW", city: "Washington",
      state: "DC", zip: "20500", country: "US", email: "customer@example.com"
    }
    @quote = @organization.shipping_quotes.create!(
      inventory_location: @location, shipping_package: package,
      cart_digest: cart.digest, destination_digest: Commerce::Shipping::Address.digest(@address),
      provider_shipment_id: "shp_checkout_test", provider_rate_id: "rate_checkout_test",
      carrier: "USPS", service: "Priority", amount_cents: 1_450, currency: "USD",
      delivery_days: 4, expires_at: 15.minutes.from_now
    )
    @previous_commerce = ENV["COMMERCE_ENABLED"]
    @previous_webhook_secret = ENV["STRIPE_WEBHOOK_SECRET"]
    @previous_fake_checkout = ENV["STRIPE_FAKE_CHECKOUT"]
    ENV["COMMERCE_ENABLED"] = "true"
    clear_enqueued_jobs
  end

  teardown do
    ENV["COMMERCE_ENABLED"] = @previous_commerce
    ENV["STRIPE_WEBHOOK_SECRET"] = @previous_webhook_secret
    ENV["STRIPE_FAKE_CHECKOUT"] = @previous_fake_checkout
    clear_enqueued_jobs
  end

  test "pickup creates a durable order and reserves stock before opening Stripe" do
    gateway = FakeStripeGateway.new
    payload = pickup_payload

    with_gateway(gateway) do
      assert_enqueued_with(job: ReleaseExpiredOrderJob) do
        post "/api/v1/shop/checkout-sessions", params: payload, as: :json
      end
    end

    assert_response :created
    order = Order.find_by!(checkout_key: payload.dig(:checkout, :checkout_key))
    assert_equal "pending_payment", order.status
    assert_equal "pickup", order.fulfillment_method
    assert_equal 7_000, order.total_cents
    assert_equal "https://checkout.stripe.test/#{order.number}", response.parsed_body["checkout_url"]
    assert_equal 8, @level.reload.on_hand
    assert_equal 2, @level.reserved
    assert_equal 1, order.inventory_reservations.active.count
    assert_equal 2, order.order_items.first.quantity
  end

  test "a repeated checkout key returns the same Stripe Session without reserving twice" do
    gateway = FakeStripeGateway.new
    payload = pickup_payload

    with_gateway(gateway) do
      post "/api/v1/shop/checkout-sessions", params: payload, as: :json
      first_body = response.parsed_body
      post "/api/v1/shop/checkout-sessions", params: payload, as: :json
      assert_equal first_body, response.parsed_body
    end

    assert_response :created
    assert_equal 1, gateway.orders.size
    assert_equal 1, Order.count
    assert_equal 2, @level.reload.reserved
  end

  test "delivery binds the verified rate, cart, address, and server total" do
    with_gateway(FakeStripeGateway.new) do
      post "/api/v1/shop/checkout-sessions", params: shipping_payload, as: :json
    end

    assert_response :created
    order = Order.last
    assert_equal @quote, order.shipping_quote
    assert_equal 7_000, order.subtotal_cents
    assert_equal 1_450, order.shipping_cents
    assert_equal 8_450, order.total_cents
    assert_equal "customer@example.com", order.customer_email
    assert_equal "1600 Pennsylvania Avenue NW", order.shipping_address["street1"]
  end

  test "a changed address or cart cannot reuse a signed delivery rate" do
    payload = shipping_payload
    payload[:checkout][:shipping_address][:zip] = "90210"

    with_gateway(FakeStripeGateway.new) do
      post "/api/v1/shop/checkout-sessions", params: payload, as: :json
    end

    assert_response :unprocessable_entity
    assert_includes response.parsed_body.fetch("error"), "address changed"
    assert_equal 0, Order.count
    assert_equal 0, @level.reload.reserved
  end

  test "a Stripe Session failure keeps the recoverable order and releases inventory" do
    with_gateway(FailingStripeGateway.new) do
      post "/api/v1/shop/checkout-sessions", params: pickup_payload, as: :json
    end

    assert_response :unprocessable_entity
    order = Order.last
    assert_equal "payment_failed", order.status
    assert_includes order.payment_error, "Stripe test failure"
    assert_equal "released", order.inventory_reservations.first.status
    assert_equal 0, @level.reload.reserved
  end

  test "an uncertain Stripe response keeps one resumable hold and retries with the same checkout key" do
    gateway = FlakyStripeGateway.new
    payload = pickup_payload

    with_gateway(gateway) do
      assert_enqueued_with(job: ReleaseExpiredOrderJob) do
        post "/api/v1/shop/checkout-sessions", params: payload, as: :json
      end
      assert_response :service_unavailable
      assert_equal 1, Order.count
      assert_equal "pending_payment", Order.last.status
      assert_equal 2, @level.reload.reserved

      post "/api/v1/shop/checkout-sessions", params: payload, as: :json
    end

    assert_response :created
    assert_equal 2, gateway.calls
    assert_equal 1, Order.count
    assert_equal 2, @level.reload.reserved
    assert_includes response.parsed_body.fetch("checkout_url"), "/retry/"
  end

  test "a signed Stripe webhook captures stock exactly once" do
    with_gateway(FakeStripeGateway.new) do
      post "/api/v1/shop/checkout-sessions", params: pickup_payload, as: :json
    end
    order = Order.last
    ENV["STRIPE_WEBHOOK_SECRET"] = "whsec_checkout_test"
    payload = stripe_event_payload(order)
    signature = stripe_signature(payload, ENV.fetch("STRIPE_WEBHOOK_SECRET"))

    2.times do
      post "/api/v1/webhooks/stripe", params: payload,
        headers: { "CONTENT_TYPE" => "application/json", "Stripe-Signature" => signature }
      assert_response :success
    end

    assert_equal "paid", order.reload.status
    assert_equal "pi_checkout_test", order.stripe_payment_intent_id
    assert_equal 6, @level.reload.on_hand
    assert_equal 0, @level.reserved
    assert_equal 1, InventoryMovement.where(reason: "sold").count
    assert_equal 1, PaymentEvent.count
    assert_equal "processed", PaymentEvent.first.status
    notification = OrderNotification.find_by!(order:, kind: "customer_order_confirmation")
    assert_equal "customer@example.com", notification.recipient
    assert_equal "pending", notification.status
    assert_equal 1, enqueued_jobs.count { |job| job[:job] == DeliverOrderNotificationJob }
  end

  test "an expired payment releases reserved stock" do
    gateway = FakeStripeGateway.new
    with_gateway(gateway) do
      post "/api/v1/shop/checkout-sessions", params: pickup_payload, as: :json
    end
    order = Order.last
    order.update_column(:payment_expires_at, 1.minute.ago)

    with_gateway(gateway) { ReleaseExpiredOrderJob.perform_now(order.id) }

    assert_equal "expired", order.reload.status
    assert_equal 0, @level.reload.reserved
    assert_equal 8, @level.on_hand
  end

  test "expiration reconciliation captures a payment that arrived before its delayed webhook" do
    gateway = FakeStripeGateway.new(status: "complete", payment_status: "paid")
    with_gateway(gateway) do
      post "/api/v1/shop/checkout-sessions", params: pickup_payload, as: :json
    end
    order = Order.last

    Commerce::Payments::ReconcileOrder.call(order:, gateway:)

    assert_equal "paid", order.reload.status
    assert_equal "pi_reconciled_test", order.stripe_payment_intent_id
    assert_equal 6, @level.reload.on_hand
    assert_equal 0, @level.reserved
  end

  test "expiration reconciliation keeps inventory reserved while Stripe still reports an open session" do
    gateway = FakeStripeGateway.new(status: "open", payment_status: "unpaid")
    with_gateway(gateway) do
      post "/api/v1/shop/checkout-sessions", params: pickup_payload, as: :json
    end
    order = Order.last

    assert_raises(Commerce::Payments::IndeterminateCheckoutError) do
      Commerce::Payments::ReconcileOrder.call(order:, gateway:)
    end

    assert_equal "pending_payment", order.reload.status
    assert_equal 2, @level.reload.reserved
  end

  test "retrying an expired checkout preserves its grace-period reservation" do
    gateway = FakeStripeGateway.new
    payload = pickup_payload
    with_gateway(gateway) do
      post "/api/v1/shop/checkout-sessions", params: payload, as: :json
      Order.last.update_column(:payment_expires_at, 1.minute.ago)
      post "/api/v1/shop/checkout-sessions", params: payload, as: :json
    end

    assert_response :service_unavailable
    assert_equal "pending_payment", Order.last.reload.status
    assert_equal 2, @level.reload.reserved
  end

  test "a mismatched Stripe total is rejected without consuming inventory" do
    with_gateway(FakeStripeGateway.new) do
      post "/api/v1/shop/checkout-sessions", params: pickup_payload, as: :json
    end
    order = Order.last
    ENV["STRIPE_WEBHOOK_SECRET"] = "whsec_checkout_test"
    payload = JSON.parse(stripe_event_payload(order))
    payload["id"] = "evt_wrong_total"
    payload.dig("data", "object")["amount_total"] = order.total_cents - 1
    payload = payload.to_json

    post "/api/v1/webhooks/stripe", params: payload,
      headers: { "CONTENT_TYPE" => "application/json", "Stripe-Signature" => stripe_signature(payload, ENV.fetch("STRIPE_WEBHOOK_SECRET")) }

    assert_response :internal_server_error
    assert_equal "pending_payment", order.reload.status
    assert_equal 8, @level.reload.on_hand
    assert_equal 2, @level.reserved
    assert_equal "failed", PaymentEvent.find_by!(provider_event_id: "evt_wrong_total").status
  end

  test "a signed Stripe event from the wrong provider mode is rejected" do
    with_gateway(FakeStripeGateway.new) do
      post "/api/v1/shop/checkout-sessions", params: pickup_payload, as: :json
    end
    order = Order.last
    event = JSON.parse(stripe_event_payload(order))
    event["id"] = "evt_wrong_mode"
    event["livemode"] = true

    assert_raises(Commerce::Payments::WebhookError) do
      Commerce::Payments::ProcessStripeEvent.call(event:)
    end

    assert_equal "pending_payment", order.reload.status
    assert_equal "failed", PaymentEvent.find_by!(provider_event_id: "evt_wrong_mode").status
  end

  test "Stripe Checkout receives only server-owned totals and safe order metadata" do
    with_gateway(FakeStripeGateway.new) do
      post "/api/v1/shop/checkout-sessions", params: pickup_payload, as: :json
    end
    order = Order.last
    order.update!(tax_cents: 300, total_cents: order.total_cents + 300)
    captured = nil
    session_service = Object.new
    session_service.define_singleton_method(:create) do |params, options|
      captured = { params:, options: }
      Struct.new(:id, :url).new("cs_test_captured", "https://checkout.stripe.test/captured")
    end
    checkout_service = Struct.new(:sessions).new(session_service)
    stripe_client = Struct.new(:v1).new(Struct.new(:checkout).new(checkout_service))
    result = Commerce::Payments::StripeGateway.new(api_key: "rk_test_captured", client: stripe_client)
      .create_checkout_session(order:)

    assert_equal "cs_test_captured", result.fetch(:id)
    assert_equal "2026-07-29.dahlia", Commerce::Payments::StripeGateway::API_VERSION
    assert_equal 3_500, captured.dig(:params, :line_items, 0, :price_data, :unit_amount)
    assert_equal 2, captured.dig(:params, :line_items, 0, :quantity)
    assert_equal 300, captured.dig(:params, :line_items, 1, :price_data, :unit_amount)
    assert_equal "Tax", captured.dig(:params, :line_items, 1, :price_data, :product_data, :name)
    assert_equal order.number, captured.dig(:params, :metadata, :order_number)
    assert_equal "commerce-order-#{order.id}", captured.dig(:options, :idempotency_key)
    assert_match(/\Amarianas_open_[a-z]{8}\z/, captured.dig(:params, :integration_identifier))
    refute captured.fetch(:params).key?(:payment_method_types)
    assert_includes captured.dig(:params, :cancel_url), order.public_token
  end

  test "the webhook rejects an invalid Stripe signature" do
    ENV["STRIPE_WEBHOOK_SECRET"] = "whsec_checkout_test"

    post "/api/v1/webhooks/stripe", params: "{}",
      headers: { "CONTENT_TYPE" => "application/json", "Stripe-Signature" => "t=1,v1=invalid" }

    assert_response :bad_request
    assert_equal 0, PaymentEvent.count
  end

  test "signed Stripe events outside the checkout lifecycle are safely ignored" do
    ENV["STRIPE_WEBHOOK_SECRET"] = "whsec_checkout_test"
    payload = { id: "evt_unrelated", type: "payment_intent.created", data: { object: { id: "pi_other" } } }.to_json

    post "/api/v1/webhooks/stripe", params: payload,
      headers: { "CONTENT_TYPE" => "application/json", "Stripe-Signature" => stripe_signature(payload, ENV.fetch("STRIPE_WEBHOOK_SECRET")) }

    assert_response :success
    event = PaymentEvent.find_by!(provider_event_id: "evt_unrelated")
    assert_equal "ignored", event.status
    assert_nil event.order
  end

  test "public order lookup uses the signed token and the local payment route is development-only" do
    with_gateway(FakeStripeGateway.new) do
      post "/api/v1/shop/checkout-sessions", params: pickup_payload, as: :json
    end
    token = response.parsed_body.fetch("order_token")

    get "/api/v1/shop/orders/#{token}"
    assert_response :success
    assert_equal "pending_payment", response.parsed_body.dig("order", "status")

    ENV["STRIPE_FAKE_CHECKOUT"] = "false"
    post "/api/v1/shop/orders/#{token}/test-payment"
    assert_response :not_found
  end

  private

  def with_gateway(gateway)
    original_gateway = Commerce::Payments.method(:gateway)
    Commerce::Payments.define_singleton_method(:gateway) { gateway }
    yield
  ensure
    Commerce::Payments.define_singleton_method(:gateway, original_gateway)
  end

  def pickup_payload
    {
      checkout: {
        checkout_key: SecureRandom.uuid,
        fulfillment_method: "pickup",
        pickup_location_id: @location.id,
        cart: [ { variant_id: @variant.id, quantity: 2 } ],
        contact: { name: "Test Customer", email: "customer@example.com", phone: "671-555-0199" }
      }
    }
  end

  def shipping_payload
    {
      checkout: {
        checkout_key: SecureRandom.uuid,
        fulfillment_method: "shipping",
        shipping_quote_token: @quote.checkout_token,
        shipping_address: @address,
        cart: [ { variant_id: @variant.id, quantity: 2 } ]
      }
    }
  end

  def stripe_event_payload(order)
    {
      id: "evt_checkout_complete",
      type: "checkout.session.completed",
      data: {
        object: {
          id: order.stripe_checkout_session_id,
          amount_total: order.total_cents,
          currency: order.currency.downcase,
          payment_status: "paid",
          payment_intent: "pi_checkout_test",
          metadata: { order_id: order.id.to_s, order_number: order.number }
        }
      }
    }.to_json
  end

  def stripe_signature(payload, secret)
    timestamp = Time.now
    signature = OpenSSL::HMAC.hexdigest("SHA256", secret, "#{timestamp.to_i}.#{payload}")
    Stripe::Webhook::Signature.generate_header(timestamp, signature)
  end
end
