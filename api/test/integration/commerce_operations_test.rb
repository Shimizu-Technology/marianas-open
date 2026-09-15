require "test_helper"

class CommerceOperationsTest < ActionDispatch::IntegrationTest
  include ActiveJob::TestHelper

  class FakeGateway
    attr_reader :refund_calls
    attr_accessor :session_total

    def initialize(fail_first: false)
      @fail_first = fail_first
      @refund_calls = []
    end

    def create_refund(refund:)
      refund_calls << { refund_id: refund.id, payment_intent_id: refund.order.stripe_payment_intent_id }
      if @fail_first
        @fail_first = false
        raise Commerce::Payments::IndeterminateRefundError, "Stripe connection dropped"
      end

      {
        id: "re_test_#{refund.id}", mode: "test", status: "succeeded",
        amount_cents: refund.amount_cents, currency: refund.currency,
        payment_intent_id: refund.order.stripe_payment_intent_id,
        balance_transaction_id: "txn_test_#{refund.id}", failure_reason: nil
      }
    end

    def retrieve_refund(id)
      refund = OrderRefund.find_by!(provider_refund_id: id)
      create_refund(refund:)
    end

    def retrieve_checkout_session(id)
      order = Order.find_by!(stripe_checkout_session_id: id)
      {
        id:, status: "complete", payment_status: "paid",
        amount_total: session_total || order.total_cents, currency: order.currency.downcase,
        payment_intent: order.stripe_payment_intent_id
      }
    end
  end

  setup do
    @organization = Organization.create!(name: "Marianas Open", slug: "marianas-open", contact_email: "support@example.org")
    @admin = User.create!(clerk_id: "operations_admin", email: "staff@example.org", role: "admin", invitation_status: "accepted")
    @headers = { "Authorization" => "Bearer test-token" }
    @location = @organization.inventory_locations.create!(
      name: "Deal Depot", code: "DEAL-DEPOT", pickup_enabled: true,
      address: { street1: "123 Marine Corps Drive", city: "Tamuning", state: "GU", zip: "96913", country: "US" }
    )
    @product = @organization.products.create!(name: "Gi", slug: "operations-gi", active: true)
    @variant = @product.product_variants.create!(name: "A2", sku: "OPS-GI-A2", price_cents: 10_000, active: true, weight_grams: 1_500)
    @order = create_paid_order
    clear_enqueued_jobs
  end

  test "partial refunds are idempotent, bounded, and do not silently restock inventory" do
    level = @variant.inventory_levels.create!(inventory_location: @location, on_hand: 4, reserved: 0)
    gateway = FakeGateway.new
    request_key = SecureRandom.uuid

    first = Commerce::Refunds::Create.call(
      order: @order, amount_cents: 2_500, reason: "requested_by_customer", staff_note: "Customer returned one item",
      actor: @admin, request_key:, gateway:
    )
    second = Commerce::Refunds::Create.call(
      order: @order, amount_cents: 2_500, reason: "requested_by_customer", staff_note: "Customer returned one item",
      actor: @admin, request_key:, gateway:
    )

    assert_equal first, second
    assert_equal 1, gateway.refund_calls.length
    assert_equal "succeeded", first.status
    assert_equal 2_500, @order.refunded_cents
    assert_equal 7_500, @order.refundable_cents
    assert_equal 4, level.reload.on_hand
    notification = @order.order_notifications.find_by!(kind: "customer_refund")
    assert_equal "refund-#{first.id}", notification.reference_key
    assert_includes notification.text_body, "$25.00"
    assert_enqueued_with(job: DeliverOrderNotificationJob)

    assert_raises(Commerce::Refunds::InvalidRefund) do
      Commerce::Refunds::Create.call(
        order: @order, amount_cents: 7_501, reason: "requested_by_customer", staff_note: "Too much",
        actor: @admin, request_key: SecureRandom.uuid, gateway:
      )
    end
  end

  test "an uncertain refund retries the same local record and provider idempotency identity" do
    gateway = FakeGateway.new(fail_first: true)
    request_key = SecureRandom.uuid

    assert_raises(Commerce::Payments::IndeterminateRefundError) do
      create_refund(request_key:, gateway:)
    end
    local = @order.order_refunds.find_by!(request_key:)
    assert_equal "error", local.status

    recovered = create_refund(request_key:, gateway:)

    assert_equal local.id, recovered.id
    assert_equal "succeeded", recovered.status
    assert_equal [ local.id, local.id ], gateway.refund_calls.pluck(:refund_id)
  end

  test "a refund request key cannot be reused for a different order" do
    request_key = SecureRandom.uuid
    create_refund(request_key:, gateway: FakeGateway.new)
    other_order = @order.dup
    other_order.number = nil
    other_order.checkout_key = SecureRandom.uuid
    other_order.stripe_checkout_session_id = "cs_test_other_order"
    other_order.stripe_payment_intent_id = "pi_test_other_order"
    other_order.save!

    assert_raises(Commerce::Refunds::InvalidRefund) do
      Commerce::Refunds::Create.call(
        order: other_order, amount_cents: 1_000, reason: "duplicate", staff_note: "Duplicate payment",
        actor: @admin, request_key:, gateway: FakeGateway.new
      )
    end
  end

  test "Stripe refund webhooks import Dashboard refunds and deduplicate events" do
    refund_object = {
      "id" => "re_dashboard_test", "livemode" => false, "status" => "succeeded", "amount" => 1_200,
      "currency" => "usd", "payment_intent" => @order.stripe_payment_intent_id,
      "balance_transaction" => "txn_dashboard_test", "reason" => "requested_by_customer",
      "metadata" => {}, "created" => Time.current.to_i
    }
    event = { "id" => "evt_refund_dashboard", "type" => "refund.created", "data" => { "object" => refund_object } }

    2.times { Commerce::Payments::ProcessStripeEvent.call(event:) }

    refund = @order.order_refunds.find_by!(provider_refund_id: "re_dashboard_test")
    assert_equal "stripe_dashboard", refund.source
    assert_equal "succeeded", refund.status
    assert_equal 1_200, refund.amount_cents
    assert_equal 1, PaymentEvent.where(provider_event_id: "evt_refund_dashboard").count
    assert_equal 1, @order.order_notifications.where(kind: "customer_refund").count
  end

  test "late Stripe events cannot regress a terminal refund" do
    refund = create_refund(request_key: SecureRandom.uuid, gateway: FakeGateway.new)

    Commerce::Refunds::ApplyProviderResult.call(
      refund:,
      payload: {
        id: refund.provider_refund_id, mode: "test", status: "pending",
        amount_cents: refund.amount_cents, currency: refund.currency,
        payment_intent_id: @order.stripe_payment_intent_id
      }
    )

    assert_equal "succeeded", refund.reload.status
    assert_equal 1, @order.order_notifications.where(kind: "customer_refund").count
  end

  test "refund webhooks cannot import records from the wrong Stripe mode" do
    event = {
      "id" => "evt_live_refund", "type" => "refund.created",
      "data" => {
        "object" => {
          "id" => "re_live_wrong_environment", "livemode" => true, "status" => "succeeded", "amount" => 1_200,
          "currency" => "usd", "payment_intent" => @order.stripe_payment_intent_id, "metadata" => {}
        }
      }
    }

    assert_raises(Commerce::Refunds::InvalidRefund) { Commerce::Payments::ProcessStripeEvent.call(event:) }
    assert_not OrderRefund.exists?(provider_refund_id: "re_live_wrong_environment")
    assert_equal "failed", PaymentEvent.find_by!(provider_event_id: "evt_live_refund").status
  end

  test "reports do not duplicate order revenue when an order has multiple refunds" do
    gateway = FakeGateway.new
    create_refund(request_key: SecureRandom.uuid, gateway:)
    Commerce::Refunds::Create.call(
      order: @order, amount_cents: 500, reason: "requested_by_customer", staff_note: "Second partial return",
      actor: @admin, request_key: SecureRandom.uuid, gateway:
    )

    summary = Commerce::OperationsSnapshot.new(organization: @organization).as_json.fetch(:summary)

    assert_equal 10_000, summary.fetch(:gross_cents)
    assert_equal 1_500, summary.fetch(:refunded_cents)
    assert_equal 8_500, summary.fetch(:net_cents)
  end

  test "a preloaded refund association cannot make the refundable balance stale" do
    @order.order_refunds.load
    create_refund(request_key: SecureRandom.uuid, gateway: FakeGateway.new)

    assert_equal 9_000, @order.refundable_cents
  end

  test "paid-order reconciliation records success and exposes mismatches as operational alerts" do
    gateway = FakeGateway.new
    Commerce::Payments::ReconcilePaidOrder.call(order: @order, gateway:)
    assert @order.reload.last_reconciled_at.present?
    assert @order.last_reconciliation_attempt_at.present?
    assert_nil @order.payment_error

    gateway.session_total = @order.total_cents + 1
    assert_raises(Commerce::Payments::CheckoutError) do
      Commerce::Payments::ReconcilePaidOrder.call(order: @order, gateway:)
    end
    assert_includes @order.reload.payment_error, "total"
    assert_operator @order.last_reconciliation_attempt_at, :>=, @order.last_reconciled_at

    snapshot = Commerce::OperationsSnapshot.new(organization: @organization).as_json
    assert_equal 1, snapshot.dig(:summary, :paid_orders)
    assert snapshot[:alerts].any? { |alert| alert[:order_number] == @order.number && alert[:category] == "payment" }
  end

  test "staff can read operations and download a cents-precise CSV while anonymous users cannot" do
    @order.update!(customer_email: "=2+2@example.org")
    get "/api/v1/admin/commerce-operations"
    assert_response :unauthorized

    with_verified_clerk do
      get "/api/v1/admin/commerce-operations", headers: @headers
      assert_response :success
      get "/api/v1/admin/commerce-operations/report", params: { from: 1.day.ago.to_date.iso8601, to: Time.zone.today.iso8601 }, headers: @headers
    end

    assert_response :success
    assert_equal "text/csv", response.media_type
    assert_includes response.body, @order.number
    assert_includes response.body, "10000"
    assert_includes response.body, "'=2+2@example.org"
  end

  private

  def create_refund(request_key:, gateway:)
    Commerce::Refunds::Create.call(
      order: @order, amount_cents: 1_000, reason: "duplicate", staff_note: "Duplicate payment",
      actor: @admin, request_key:, gateway:
    )
  end

  def create_paid_order
    order = @organization.orders.create!(
      inventory_location: @location, checkout_key: SecureRandom.uuid, status: "paid", fulfillment_method: "pickup",
      customer_name: "Kai Customer", customer_email: "kai@example.org", currency: "USD",
      subtotal_cents: 10_000, total_cents: 10_000, payment_expires_at: 30.minutes.from_now,
      paid_at: Time.current, stripe_checkout_session_id: "cs_test_operations", stripe_payment_intent_id: "pi_test_operations"
    )
    order.order_items.create!(
      product: @product, product_variant: @variant, product_name: @product.name, variant_name: @variant.name,
      sku: @variant.sku, unit_price_cents: 10_000, quantity: 1, line_total_cents: 10_000, currency: "USD"
    )
    order
  end

  def with_verified_clerk
    original_verify = ClerkAuth.method(:verify)
    ClerkAuth.define_singleton_method(:verify) { |_token| { "sub" => "operations_admin", "email" => "staff@example.org" } }
    yield
  ensure
    ClerkAuth.define_singleton_method(:verify, original_verify)
  end
end
