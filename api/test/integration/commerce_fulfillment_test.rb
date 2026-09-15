require "test_helper"
require "openssl"

class CommerceFulfillmentTest < ActionDispatch::IntegrationTest
  include ActiveJob::TestHelper

  class FakeLabelGateway
    attr_reader :calls, :last_request

    def initialize
      @calls = 0
    end

    def purchase_label(shipment_id:, rate_id:)
      @calls += 1
      @last_request = { shipment_id:, rate_id: }
      {
        mode: "test", status: "pre_transit", tracking_code: "EZ1000000001",
        tracking_url: "https://track.easypost.test/EZ1000000001", tracker_id: "trk_test_fulfillment",
        label_url: "https://labels.easypost.test/label.png", label_format: "image/png",
        postage_cents: 1_450, currency: "USD"
      }
    end
  end

  class FlakyLabelGateway < FakeLabelGateway
    def purchase_label(shipment_id:, rate_id:)
      @attempts ||= 0
      @attempts += 1
      if @attempts == 1
        @last_request = { shipment_id:, rate_id: }
        raise Commerce::Shipping::LabelError, "EasyPost connection dropped"
      end

      super
    end
  end

  setup do
    @organization = Organization.create!(name: "Marianas Open", slug: "marianas-open", contact_email: "support@example.org")
    @admin = User.create!(clerk_id: "fulfillment_admin", email: "staff@example.org", role: "admin", invitation_status: "accepted")
    @headers = { "Authorization" => "Bearer test-token" }
    @location = @organization.inventory_locations.create!(
      name: "Deal Depot", code: "DEAL-DEPOT", pickup_enabled: true, shipping_enabled: true,
      address: { street1: "123 Marine Corps Drive", city: "Tamuning", state: "GU", zip: "96913", country: "US" }
    )
    package = @organization.shipping_packages.create!(
      name: "Apparel box", length_mm: 305, width_mm: 229, height_mm: 76,
      empty_weight_grams: 150, max_weight_grams: 4_500
    )
    @product = @organization.products.create!(name: "Towel", slug: "towel", active: true)
    @variant = @product.product_variants.create!(name: "Standard", sku: "TOWEL-FULFILL", price_cents: 3_500, active: true, weight_grams: 500)
    @quote = @organization.shipping_quotes.create!(
      inventory_location: @location, shipping_package: package,
      cart_digest: "cart", destination_digest: "destination",
      provider_shipment_id: "shp_fulfillment_test", provider_rate_id: "rate_fulfillment_test",
      carrier: "USPS", service: "Priority", amount_cents: 1_450, currency: "USD",
      expires_at: 15.minutes.from_now
    )
    clear_enqueued_jobs
  end

  test "staff moves pickup orders through the physical workflow and queues the ready message once" do
    order = create_order(method: "pickup")

    with_verified_clerk do
      post "/api/v1/admin/orders/#{order.id}/fulfillment", params: { fulfillment: { status: "preparing" } }, headers: @headers, as: :json
      assert_response :success
      post "/api/v1/admin/orders/#{order.id}/fulfillment", params: { fulfillment: { status: "ready_for_pickup" } }, headers: @headers, as: :json
    end

    assert_response :success
    assert_equal "ready_for_pickup", response.parsed_body.dig("order", "fulfillment", "status")
    assert_equal 1, order.order_notifications.where(kind: "customer_pickup_ready").count
    assert_includes order.order_notifications.find_by!(kind: "customer_pickup_ready").text_body, "123 Marine Corps Drive"
    assert_enqueued_with(job: DeliverOrderNotificationJob)

    with_verified_clerk do
      post "/api/v1/admin/orders/#{order.id}/fulfillment", params: { fulfillment: { status: "shipped" } }, headers: @headers, as: :json
    end
    assert_response :unprocessable_entity
  end

  test "label purchase is recoverable and idempotent before carrier handoff" do
    order = create_order(method: "shipping")
    Commerce::Fulfillment::Transition.call(order:, status: "preparing", actor: @admin)
    gateway = FakeLabelGateway.new

    first = Commerce::Fulfillment::PurchaseLabel.call(order:, gateway:)
    order.order_notifications.where(kind: "customer_tracking").delete_all
    clear_enqueued_jobs
    second = Commerce::Fulfillment::PurchaseLabel.call(order:, gateway:)

    assert_equal first, second
    assert_equal 1, gateway.calls
    assert_equal({ shipment_id: @quote.provider_shipment_id, rate_id: @quote.provider_rate_id }, gateway.last_request)
    assert first.purchased?
    assert_equal "test", first.provider_mode
    assert_equal 1_450, first.postage_cents
    assert_equal 1, order.order_notifications.where(kind: "customer_tracking").count
    assert_enqueued_with(job: DeliverOrderNotificationJob)

    Commerce::Fulfillment::Transition.call(order:, status: "shipped", actor: @admin)
    public_order = Commerce::OrderPresenter.new(order.reload).as_json
    assert_equal "shipped", public_order[:fulfillment_status]
    assert_equal "EZ1000000001", public_order.dig(:shipment, "tracking_code") || public_order.dig(:shipment, :tracking_code)
    assert_nil public_order.dig(:shipment, :label_url)
  end

  test "failed label purchase retries the existing shipment and rate" do
    order = create_order(method: "shipping")
    Commerce::Fulfillment::Transition.call(order:, status: "preparing", actor: @admin)
    gateway = FlakyLabelGateway.new

    assert_raises(Commerce::Shipping::LabelError) do
      Commerce::Fulfillment::PurchaseLabel.call(order:, gateway:)
    end

    failed_shipment = order.reload.shipment
    assert_equal "error", failed_shipment.status
    assert_equal @quote.provider_shipment_id, failed_shipment.provider_shipment_id
    assert_equal @quote.provider_rate_id, failed_shipment.provider_rate_id

    recovered = Commerce::Fulfillment::PurchaseLabel.call(order:, gateway:)

    assert_equal failed_shipment.id, recovered.id
    assert recovered.purchased?
    assert_equal({ shipment_id: @quote.provider_shipment_id, rate_id: @quote.provider_rate_id }, gateway.last_request)
  end

  test "signed EasyPost tracking events update the shipment once and mark delivery" do
    order = create_order(method: "shipping")
    Commerce::Fulfillment::Transition.call(order:, status: "preparing", actor: @admin)
    shipment = Commerce::Fulfillment::PurchaseLabel.call(order:, gateway: FakeLabelGateway.new)
    Commerce::Fulfillment::Transition.call(order:, status: "shipped", actor: @admin)
    previous_secret = ENV["EASYPOST_WEBHOOK_SECRET"]
    ENV["EASYPOST_WEBHOOK_SECRET"] = "fulfillment-webhook-secret"
    payload = {
      id: "evt_tracker_delivered", description: "tracker.updated", mode: "test",
      created_at: Time.current.iso8601(6),
      result: { id: shipment.provider_tracker_id, tracking_code: shipment.tracking_code, status: "delivered", public_url: shipment.tracking_url }
    }.to_json
    signature = "hmac-sha256-hex=#{OpenSSL::HMAC.hexdigest('sha256', ENV.fetch('EASYPOST_WEBHOOK_SECRET'), payload)}"

    2.times do
      post "/api/v1/webhooks/easypost", params: payload, headers: { "CONTENT_TYPE" => "application/json", "X-Hmac-Signature" => signature }
      assert_response :success
    end

    assert_equal "delivered", shipment.reload.status
    assert_equal "delivered", order.fulfillment.reload.status
    assert_equal 1, ShipmentEvent.where(provider_event_id: "evt_tracker_delivered").count
  ensure
    ENV["EASYPOST_WEBHOOK_SECRET"] = previous_secret
  end

  test "stale EasyPost tracking events cannot regress shipment status" do
    order = create_order(method: "shipping")
    Commerce::Fulfillment::Transition.call(order:, status: "preparing", actor: @admin)
    shipment = Commerce::Fulfillment::PurchaseLabel.call(order:, gateway: FakeLabelGateway.new)
    newer_time = Time.current.change(usec: 0)
    newer = tracking_event(shipment:, id: "evt_tracking_newer", status: "out_for_delivery", created_at: newer_time)
    older = tracking_event(shipment:, id: "evt_tracking_older", status: "in_transit", created_at: newer_time - 5.minutes)

    Commerce::Fulfillment::ProcessEasyPostEvent.call(payload: newer)
    Commerce::Fulfillment::ProcessEasyPostEvent.call(payload: older)

    assert_equal "out_for_delivery", shipment.reload.status
    assert_equal newer_time, shipment.last_tracking_update_at
    assert_equal "ignored", ShipmentEvent.find_by!(provider_event_id: "evt_tracking_older").status
  end

  test "EasyPost webhook rejects an invalid signature without recording an event" do
    previous_secret = ENV["EASYPOST_WEBHOOK_SECRET"]
    ENV["EASYPOST_WEBHOOK_SECRET"] = "fulfillment-webhook-secret"
    payload = { id: "evt_invalid_signature", description: "tracker.updated", mode: "test", result: {} }.to_json

    assert_no_difference "ShipmentEvent.count" do
      post "/api/v1/webhooks/easypost", params: payload,
        headers: { "CONTENT_TYPE" => "application/json", "X-Hmac-Signature" => "hmac-sha256-hex=invalid" }
    end

    assert_response :bad_request
  ensure
    ENV["EASYPOST_WEBHOOK_SECRET"] = previous_secret
  end

  test "admin queue lists only paid orders and requires staff authentication" do
    paid = create_order(method: "pickup")
    create_order(method: "pickup", status: "pending_payment")

    get "/api/v1/admin/orders"
    assert_response :unauthorized

    with_verified_clerk { get "/api/v1/admin/orders", params: { status: "unfulfilled" }, headers: @headers }
    assert_response :success
    assert_equal [ paid.number ], response.parsed_body.fetch("orders").pluck("number")
  end

  private

  def tracking_event(shipment:, id:, status:, created_at:)
    {
      "id" => id, "description" => "tracker.updated", "mode" => "test", "created_at" => created_at.iso8601,
      "result" => { "id" => shipment.provider_tracker_id, "tracking_code" => shipment.tracking_code, "status" => status }
    }
  end

  def create_order(method:, status: "paid")
    order = @organization.orders.create!(
      inventory_location: @location, shipping_quote: method == "shipping" ? @quote : nil,
      checkout_key: SecureRandom.uuid, status:, fulfillment_method: method,
      customer_name: "Kai Customer", customer_email: "kai@example.org", currency: "USD",
      shipping_address: method == "shipping" ? { street1: "1600 Main St", city: "Los Angeles", state: "CA", zip: "90001", country: "US" } : {},
      subtotal_cents: 3_500, shipping_cents: method == "shipping" ? 1_450 : 0,
      total_cents: method == "shipping" ? 4_950 : 3_500,
      payment_expires_at: 30.minutes.from_now, paid_at: status == "paid" ? Time.current : nil
    )
    order.order_items.create!(product: @product, product_variant: @variant, product_name: @product.name,
      variant_name: @variant.name, sku: @variant.sku, unit_price_cents: 3_500, quantity: 1,
      line_total_cents: 3_500, currency: "USD")
    order
  end

  def with_verified_clerk
    original_verify = ClerkAuth.method(:verify)
    ClerkAuth.define_singleton_method(:verify) { |_token| { "sub" => "fulfillment_admin", "email" => "staff@example.org" } }
    yield
  ensure
    ClerkAuth.define_singleton_method(:verify, original_verify)
  end
end
