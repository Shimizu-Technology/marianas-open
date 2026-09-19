require "test_helper"

class CommercePocTest < ActionDispatch::IntegrationTest
  class RecordingGateway
    attr_reader :session_calls, :refund_calls

    def initialize
      @session_calls = []
      @refund_calls = []
    end

    def retrieve_checkout_session(id)
      @session_calls << id
      raise "A demo order reached the active payment gateway"
    end

    def create_refund(refund:)
      @refund_calls << refund.id
      raise "A demo refund reached the active payment gateway"
    end

    def retrieve_refund(id)
      @refund_calls << id
      raise "A demo refund reached the active payment gateway"
    end
  end

  setup do
    @previous_commerce = ENV["COMMERCE_ENABLED"]
    @previous_poc = ENV["COMMERCE_POC_MODE"]
    @previous_deployment = ENV["COMMERCE_DEPLOYMENT_ENV"]
    @previous_stripe_key = ENV["STRIPE_API_KEY"]
    @previous_easypost_key = ENV["EASYPOST_API_KEY"]
    @previous_frontend_url = ENV["PUBLIC_FRONTEND_URL"]
    @previous_email_mode = ENV["COMMERCE_EMAIL_DELIVERY_MODE"]
    ENV["COMMERCE_ENABLED"] = "true"

    @organization = Organization.create!(name: "Marianas Open", slug: "marianas-open")
    @location = @organization.inventory_locations.create!(
      name: "Deal Depot", code: "DEAL-DEPOT", pickup_enabled: true, shipping_enabled: true,
      pickup_instructions: "Bring your confirmation email and a photo ID.", phone: "671-555-0100",
      address: { street1: "123 Marine Corps Drive", city: "Tamuning", state: "GU", zip: "96913", country: "US" }
    )
    @organization.shipping_packages.create!(
      name: "POC demo parcel", demo_only: true, length_mm: 305, width_mm: 229,
      height_mm: 76, empty_weight_grams: 150, max_weight_grams: 5_000
    )
    @product = @organization.products.create!(
      name: "Preview towel", slug: "preview-towel", demo_only: true,
      active: true, shippable: true, pickup_enabled: true
    )
    @variant = @product.product_variants.create!(
      name: "Standard", sku: "PREVIEW-TOWEL", price_cents: 3_500, active: true,
      allow_shipping: true, allow_pickup: true, weight_grams: 420,
      country_of_origin: "US", customs_description: "Preview towel"
    )
    @variant.inventory_levels.create!(inventory_location: @location, on_hand: 5)
  end

  teardown do
    ENV["COMMERCE_ENABLED"] = @previous_commerce
    ENV["COMMERCE_POC_MODE"] = @previous_poc
    ENV["COMMERCE_DEPLOYMENT_ENV"] = @previous_deployment
    ENV["STRIPE_API_KEY"] = @previous_stripe_key
    ENV["EASYPOST_API_KEY"] = @previous_easypost_key
    ENV["PUBLIC_FRONTEND_URL"] = @previous_frontend_url
    ENV["COMMERCE_EMAIL_DELIVERY_MODE"] = @previous_email_mode
  end

  test "the POC switch cannot activate outside production Rails on a staging deployment" do
    ENV["COMMERCE_POC_MODE"] = "true"
    ENV["COMMERCE_DEPLOYMENT_ENV"] = "staging"
    ENV["PUBLIC_FRONTEND_URL"] = "https://mo.shimizu-technology.com"
    ENV["COMMERCE_EMAIL_DELIVERY_MODE"] = "disabled"
    assert_not Commerce::Configuration.poc_mode?

    with_production_rails_env do
      assert Commerce::Configuration.poc_mode?
      ENV["COMMERCE_DEPLOYMENT_ENV"] = "production"
      assert_not Commerce::Configuration.poc_mode?
      ENV["COMMERCE_DEPLOYMENT_ENV"] = "staging"
      ENV["PUBLIC_FRONTEND_URL"] = "https://marianasopen.com"
      assert_not Commerce::Configuration.poc_mode?
    end
  end

  test "mock gateways take precedence over provider keys when the POC is explicitly active" do
    ENV["STRIPE_API_KEY"] = "rk_test_unusable"
    ENV["EASYPOST_API_KEY"] = "EZTKunusable"

    with_poc_mode do
      assert_instance_of Commerce::Payments::DevelopmentGateway, Commerce::Payments.gateway
      assert_instance_of Commerce::Shipping::DevelopmentGateway, Commerce::Shipping.gateway
      assert_equal "mock", Commerce::Payments.provider_mode
      assert_equal "mock", Commerce::Shipping.provider_mode
    end
  end

  test "demo pickup hides real collection instructions even after POC mode ends" do
    with_poc_mode do
      get "/api/v1/shop/fulfillment"
      pickup = response.parsed_body.fetch("pickup_locations").first
      assert_nil pickup["pickup_instructions"]
      assert_nil pickup["phone"]

      post "/api/v1/shop/checkout-sessions", params: {
        checkout: {
          checkout_key: SecureRandom.uuid, fulfillment_method: "pickup",
          cart: [ { variant_id: @variant.id, quantity: 1 } ], pickup_location_id: @location.id,
          contact: { name: "Demo Customer", email: "demo@example.test" }
        }
      }, as: :json
      assert_response :created
      @order_token = response.parsed_body.fetch("order_token")
    end

    get "/api/v1/shop/orders/#{@order_token}"
    assert_response :success
    assert_equal true, response.parsed_body.dig("order", "simulated")
    assert_nil response.parsed_body.dig("order", "pickup_location", "pickup_instructions")
    assert_nil response.parsed_body.dig("order", "pickup_location", "phone")
  end

  test "demo pickup cannot queue or deliver a ready email after POC mode ends" do
    with_poc_mode do
      post "/api/v1/shop/checkout-sessions", params: {
        checkout: {
          checkout_key: SecureRandom.uuid, fulfillment_method: "pickup",
          cart: [ { variant_id: @variant.id, quantity: 1 } ], pickup_location_id: @location.id,
          contact: { name: "Demo Customer", email: "demo@example.test" }
        }
      }, as: :json
      assert_response :created
      post "/api/v1/shop/orders/#{response.parsed_body.fetch('order_token')}/test-payment", as: :json
      assert_response :success
    end

    order = Order.last.reload
    ENV["COMMERCE_EMAIL_DELIVERY_MODE"] = "live"
    Commerce::Fulfillment::Transition.call(order:, status: "preparing", actor: nil)
    Commerce::Fulfillment::Transition.call(order:, status: "ready_for_pickup", actor: nil)
    assert_empty order.order_notifications.where(kind: "customer_pickup_ready")

    # A ready message queued by an older version must also be blocked at delivery.
    message = Commerce::Notifications::FulfillmentUpdateMessage.new(order:, status: "ready_for_pickup").call
    assert_includes message.text, @location.public_address.fetch("street1")
    notification = order.order_notifications.create!(
      kind: "customer_pickup_ready", recipient: order.customer_email,
      subject: message.subject, html_body: message.html, text_body: message.text
    )
    deliveries = []
    gateway = Object.new
    gateway.define_singleton_method(:deliver) { |**details| deliveries << details }

    Commerce::Notifications::DeliverOrder.new(notification:, gateway:, mode: "live").call

    assert_empty deliveries
    assert_equal "suppressed", notification.reload.status
    assert_equal "disabled", notification.delivery_mode
    assert_match(/simulated/i, notification.last_error)
  end

  test "demo delivery, payment, label and refund work without external providers" do
    with_poc_mode do
      get "/api/v1/shop/configuration"
      assert_response :success
      assert_equal true, response.parsed_body["poc_mode"]
      assert_equal true, response.parsed_body["fake_checkout_enabled"]

      get "/api/v1/shop/products"
      assert_equal [ "preview-towel" ], response.parsed_body.fetch("products").pluck("slug")

      get "/api/v1/shop/fulfillment"
      assert_equal true, response.parsed_body["shipping_available"]

      post "/api/v1/shop/shipping-quotes", params: {
        shipping_quote: { cart: [ { variant_id: @variant.id, quantity: 1 } ], address: address }
      }, as: :json
      assert_response :created
      assert_match(/simulated/i, response.parsed_body.fetch("messages").first)
      assert_equal "Demo carrier", response.parsed_body.dig("rates", 0, "carrier")
      quote = response.parsed_body.fetch("rates").first

      post "/api/v1/shop/checkout-sessions", params: {
        checkout: {
          checkout_key: SecureRandom.uuid, fulfillment_method: "shipping",
          cart: [ { variant_id: @variant.id, quantity: 1 } ],
          shipping_quote_token: quote.fetch("token"), shipping_address: address
        }
      }, as: :json
      assert_response :created
      assert_equal @variant.price_cents + quote.fetch("amount_cents"), Order.last.total_cents
      token = response.parsed_body.fetch("order_token")
      assert_equal "/shop/orders/#{token}?test_checkout=1", response.parsed_body.fetch("checkout_url")

      post "/api/v1/shop/orders/#{token}/test-payment", as: :json
      assert_response :success
      order = Order.last.reload
      assert order.simulated?
      assert_equal "paid", order.status
      assert_equal true, response.parsed_body.dig("order", "simulated")
      assert_equal 0, Commerce::OperationsSnapshot.new(organization: @organization).as_json.dig(:reconciliation, :due)

      Commerce::Fulfillment::Transition.call(order:, status: "preparing", actor: nil)
      shipment = Commerce::Fulfillment::PurchaseLabel.call(order:)
      assert_equal "mock", shipment.provider_mode
      assert_nil shipment.tracking_url
      assert_equal "mock", shipment.label_format

      refund = Commerce::Refunds::Create.call(
        order:, amount_cents: 500, reason: "requested_by_customer", staff_note: "POC exercise",
        actor: nil, request_key: SecureRandom.uuid
      )
      assert_equal "succeeded", refund.status
      assert_equal "mock", refund.provider_mode
      assert_equal 500, order.reload.refunded_cents
    end
  end

  test "demo catalog and packaging do not count as real launch readiness" do
    checks = Commerce::LaunchReadiness.new(organization: @organization).as_json.fetch(:automatic_checks)
      .index_by { |check| check.fetch(:key) }
    assert_equal "blocked", checks.fetch("shipping_packages").fetch(:status)
    assert_equal "blocked", checks.fetch("published_catalog").fetch(:status)

    get "/api/v1/shop/products"
    assert_response :success
    assert_empty response.parsed_body.fetch("products")
    get "/api/v1/shop/fulfillment"
    assert_equal false, response.parsed_body["shipping_available"]
  end

  test "a simulated checkout cannot be resumed or newly charged after leaving POC mode" do
    payload = {
      checkout: {
        checkout_key: SecureRandom.uuid, fulfillment_method: "pickup",
        cart: [ { variant_id: @variant.id, quantity: 1 } ],
        pickup_location_id: @location.id,
        contact: { name: "Demo Customer", email: "demo@example.com" }
      }
    }
    with_poc_mode do
      post "/api/v1/shop/checkout-sessions", params: payload, as: :json
      assert_response :created
    end
    order = Order.last
    assert order.simulated?
    ENV["STRIPE_API_KEY"] = "rk_test_not_called"

    post "/api/v1/shop/checkout-sessions", params: payload, as: :json
    assert_response :unprocessable_entity
    assert_match(/different shop environment/, response.parsed_body.fetch("error"))

    payload[:checkout][:checkout_key] = SecureRandom.uuid
    post "/api/v1/shop/checkout-sessions", params: payload, as: :json
    assert_response :unprocessable_entity
    assert_equal 1, Order.count
  end

  test "a simulated shipping quote cannot be used after switching to a real gateway" do
    quote_token = nil
    with_poc_mode do
      post "/api/v1/shop/shipping-quotes", params: {
        shipping_quote: { cart: [ { variant_id: @variant.id, quantity: 1 } ], address: address }
      }, as: :json
      assert_response :created
      quote_token = response.parsed_body.dig("rates", 0, "token")
    end
    @product.update!(demo_only: false)
    ENV["STRIPE_API_KEY"] = "rk_test_not_called"

    post "/api/v1/shop/checkout-sessions", params: {
      checkout: {
        checkout_key: SecureRandom.uuid, fulfillment_method: "shipping",
        cart: [ { variant_id: @variant.id, quantity: 1 } ],
        shipping_quote_token: quote_token, shipping_address: address
      }
    }, as: :json

    assert_response :unprocessable_entity
    assert_match(/different shop environment/, response.parsed_body.fetch("error"))
    assert_equal 0, Order.count
  end

  test "a reserved POC order stays simulated even if its fake session was never created" do
    attributes = {
      checkout_key: SecureRandom.uuid, fulfillment_method: "pickup",
      cart: [ { variant_id: @variant.id, quantity: 1 } ], pickup_location_id: @location.id,
      contact: { name: "Demo Customer", email: "demo@example.com" }
    }
    failing_gateway = Object.new
    def failing_gateway.create_checkout_session(order:)
      raise Commerce::Payments::IndeterminateCheckoutError, "Demo gateway interrupted for #{order.number}"
    end

    with_poc_mode do
      assert_raises(Commerce::Payments::IndeterminateCheckoutError) do
        Commerce::Checkout::Create.new(organization: @organization, attributes:, gateway: failing_gateway).call
      end
    end
    assert Order.last.simulated?
    assert_nil Order.last.stripe_checkout_session_id
    ENV["STRIPE_API_KEY"] = "rk_test_not_called"

    post "/api/v1/shop/checkout-sessions", params: { checkout: attributes }, as: :json
    assert_response :unprocessable_entity
    assert_match(/different shop environment/, response.parsed_body.fetch("error"))
  end

  test "a failed mock refund cannot be retried against a real Stripe gateway" do
    with_poc_mode do
      post "/api/v1/shop/checkout-sessions", params: {
        checkout: {
          checkout_key: SecureRandom.uuid, fulfillment_method: "pickup",
          cart: [ { variant_id: @variant.id, quantity: 1 } ], pickup_location_id: @location.id,
          contact: { name: "Demo Customer", email: "demo@example.com" }
        }
      }, as: :json
      assert_response :created
      post "/api/v1/shop/orders/#{response.parsed_body.fetch("order_token")}/test-payment", as: :json
      assert_response :success
    end
    order = Order.last
    request_key = SecureRandom.uuid
    order.order_refunds.create!(
      provider_mode: "mock", request_key:, source: "admin", status: "error",
      reason: "requested_by_customer", staff_note: "Retry guard test", amount_cents: 500,
      currency: "USD", requested_at: Time.current
    )
    ENV["STRIPE_API_KEY"] = "rk_test_not_called"

    assert_raises(Commerce::Refunds::InvalidRefund) do
      Commerce::Refunds::Create.call(
        order:, amount_cents: 500, reason: "requested_by_customer", staff_note: "Retry guard test",
        actor: nil, request_key:
      )
    end
    assert_equal "error", order.order_refunds.last.status
  end

  test "paid demo orders and refunds never reach Stripe reconciliation after POC mode ends" do
    with_poc_mode do
      post "/api/v1/shop/checkout-sessions", params: {
        checkout: {
          checkout_key: SecureRandom.uuid, fulfillment_method: "pickup",
          cart: [ { variant_id: @variant.id, quantity: 1 } ], pickup_location_id: @location.id,
          contact: { name: "Demo Customer", email: "demo@example.test" }
        }
      }, as: :json
      assert_response :created
      post "/api/v1/shop/orders/#{response.parsed_body.fetch('order_token')}/test-payment", as: :json
      assert_response :success
    end
    order = Order.last
    refund = order.order_refunds.create!(
      provider_mode: "mock", request_key: SecureRandom.uuid, source: "admin", status: "error",
      reason: "requested_by_customer", staff_note: "Demo retry guard", amount_cents: 500,
      currency: "USD", requested_at: Time.current
    )
    ENV["STRIPE_API_KEY"] = "rk_test_not_called"
    gateway = RecordingGateway.new

    with_recording_gateway(gateway) { ReconcileCommerceJob.perform_now }
    assert_empty gateway.session_calls
    assert_empty gateway.refund_calls
    assert_nil order.reload.last_reconciliation_attempt_at

    assert_raises(Commerce::Payments::CheckoutError) do
      Commerce::Payments::ReconcilePaidOrder.call(order:, gateway:)
    end
    assert_raises(Commerce::Payments::RefundError) do
      Commerce::Refunds::Reconcile.call(refund:, gateway:)
    end
    assert_empty gateway.session_calls
    assert_empty gateway.refund_calls
    assert_equal "error", refund.reload.status

    User.create!(clerk_id: "poc_staff", email: "pocstaff@example.test", role: "admin", invitation_status: "accepted")
    with_verified_clerk do
      with_recording_gateway(gateway) do
        post "/api/v1/admin/orders/#{order.id}/reconciliation", headers: { "Authorization" => "Bearer test-token" }, as: :json
        assert_response :bad_gateway
        assert_match(/Demo orders cannot be reconciled/, response.parsed_body.fetch("error"))

        post "/api/v1/admin/orders/#{order.id}/refunds/#{refund.id}/reconcile",
          headers: { "Authorization" => "Bearer test-token" }, as: :json
        assert_response :bad_gateway
        assert_match(/different payment environment/, response.parsed_body.fetch("error"))
      end
    end
    assert_empty gateway.session_calls
    assert_empty gateway.refund_calls

    snapshot = Commerce::OperationsSnapshot.new(organization: @organization).as_json
    assert snapshot.fetch(:simulated_preview)
    assert_equal 0, snapshot.dig(:reconciliation, :due)

    # Older mock checkout records are recognizable by their session ID even if
    # they predate the persisted simulated flag.
    order.update_columns(simulated: false)
    assert order.reload.simulated?
    with_recording_gateway(gateway) { ReconcileCommerceJob.perform_now }
    assert_empty gateway.session_calls
    assert_empty gateway.refund_calls
    legacy_snapshot = Commerce::OperationsSnapshot.new(organization: @organization).as_json
    assert legacy_snapshot.fetch(:simulated_preview)
    assert_equal 0, legacy_snapshot.dig(:reconciliation, :due)
  end

  private

  def with_poc_mode
    original = Commerce::Configuration.method(:poc_mode?)
    Commerce::Configuration.define_singleton_method(:poc_mode?) { true }
    yield
  ensure
    Commerce::Configuration.define_singleton_method(:poc_mode?, original)
  end

  def with_production_rails_env
    original = Rails.method(:env)
    Rails.define_singleton_method(:env) { ActiveSupport::StringInquirer.new("production") }
    yield
  ensure
    Rails.define_singleton_method(:env, original)
  end

  def with_verified_clerk
    original = ClerkAuth.method(:verify)
    ClerkAuth.define_singleton_method(:verify) { |_token| { "sub" => "poc_staff", "email" => "pocstaff@example.test" } }
    yield
  ensure
    ClerkAuth.define_singleton_method(:verify, original)
  end

  def with_recording_gateway(gateway)
    original = Commerce::Payments.method(:gateway)
    Commerce::Payments.define_singleton_method(:gateway) { gateway }
    yield
  ensure
    Commerce::Payments.define_singleton_method(:gateway, original)
  end

  def address
    {
      name: "Demo Customer", street1: "1600 Pennsylvania Avenue NW", city: "Washington",
      state: "DC", zip: "20500", country: "US", email: "demo@example.com"
    }
  end
end
