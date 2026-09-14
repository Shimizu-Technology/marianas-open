require "test_helper"

class CommerceNotificationsTest < ActionDispatch::IntegrationTest
  include ActiveJob::TestHelper

  class FakeGateway
    attr_reader :deliveries

    def initialize(fail_with: nil)
      @fail_with = fail_with
      @deliveries = []
    end

    def deliver(notification:, to:)
      raise Commerce::Notifications::DeliveryError, @fail_with if @fail_with

      deliveries << { notification:, to: }
      "email_test_#{notification.id}"
    end
  end

  setup do
    @previous_operations = ENV["COMMERCE_OPERATIONS_EMAILS"]
    @previous_mode = ENV["COMMERCE_EMAIL_DELIVERY_MODE"]
    @previous_sandbox = ENV["COMMERCE_EMAIL_SANDBOX_TO"]
    ENV.delete("COMMERCE_OPERATIONS_EMAILS")
    ENV["COMMERCE_EMAIL_DELIVERY_MODE"] = "disabled"
    clear_enqueued_jobs

    @organization = Organization.create!(name: "Marianas Open", slug: "marianas-open", contact_email: "support@example.org")
    @location = @organization.inventory_locations.create!(
      name: "Deal Depot", code: "DEAL-DEPOT", pickup_enabled: true,
      address: { street1: "123 Marine Corps Drive", city: "Tamuning", state: "GU", zip: "96913", country: "US" }
    )
    @product = @organization.products.create!(name: "Gi <Limited>", slug: "limited-gi", active: true)
    @variant = @product.product_variants.create!(
      name: "Black / A2", sku: "GI-BLK-A2", price_cents: 12_500,
      active: true, weight_grams: 1_800
    )
    @order = @organization.orders.create!(
      inventory_location: @location,
      number: "MO-20260915-NOTIFY01",
      checkout_key: "11111111-2222-4333-8444-555555555555",
      status: "paid",
      fulfillment_method: "pickup",
      customer_name: "Kai <Customer>",
      customer_email: "kai@example.org",
      currency: "USD",
      subtotal_cents: 12_500,
      total_cents: 12_500,
      payment_expires_at: 30.minutes.from_now,
      paid_at: Time.current
    )
    @order.order_items.create!(
      product: @product,
      product_variant: @variant,
      product_name: "Gi <Limited>",
      variant_name: "Black / A2",
      sku: "GI-BLK-A2",
      unit_price_cents: 12_500,
      quantity: 1,
      line_total_cents: 12_500,
      currency: "USD"
    )
  end

  teardown do
    ENV["COMMERCE_OPERATIONS_EMAILS"] = @previous_operations
    ENV["COMMERCE_EMAIL_DELIVERY_MODE"] = @previous_mode
    ENV["COMMERCE_EMAIL_SANDBOX_TO"] = @previous_sandbox
    clear_enqueued_jobs
  end

  test "paid-order messages are snapshotted once for the customer and configured operations team" do
    ENV["COMMERCE_OPERATIONS_EMAILS"] = "orders@example.org, deal-depot@example.org, invalid"

    first = Commerce::Notifications::QueueOrderPaid.call(order: @order)
    second = Commerce::Notifications::QueueOrderPaid.call(order: @order)

    assert_equal 3, first.size
    assert_equal first.map(&:id), second.map(&:id)
    assert_equal 3, @order.order_notifications.count
    customer = @order.order_notifications.find_by!(kind: "customer_order_confirmation")
    assert_equal "kai@example.org", customer.recipient
    assert_includes customer.subject, @order.number
    assert_includes customer.text_body, "View your order status"
    assert_includes customer.html_body, "Gi &lt;Limited&gt;"
    operations = @order.order_notifications.find_by!(kind: "operations_new_order", recipient: "orders@example.org")
    assert_includes operations.html_body, "Kai &lt;Customer&gt;"
    assert_match(%r{\Amarianas-open/test/customer_order_confirmation/#{@order.id}/[0-9a-f]{16}\z}, customer.idempotency_key)
  end

  test "disabled delivery records an intentional suppression without calling a provider" do
    notification = Commerce::Notifications::QueueOrderPaid.call(order: @order).first
    gateway = FakeGateway.new

    Commerce::Notifications::DeliverOrder.new(notification:, gateway:, mode: "disabled").call

    assert_equal "suppressed", notification.reload.status
    assert_equal "disabled", notification.delivery_mode
    assert_equal 1, notification.attempts
    assert_empty gateway.deliveries
  end

  test "sandbox delivery can only route to an approved Resend test address" do
    notification = Commerce::Notifications::QueueOrderPaid.call(order: @order).first
    gateway = FakeGateway.new
    ENV["COMMERCE_EMAIL_SANDBOX_TO"] = "delivered+commerce-qa@resend.dev"

    Commerce::Notifications::DeliverOrder.new(notification:, gateway:, mode: "sandbox").call

    assert_equal "sent", notification.reload.status
    assert_equal "delivered+commerce-qa@resend.dev", notification.delivered_to
    assert_equal "kai@example.org", notification.recipient
    assert_equal [ "delivered+commerce-qa@resend.dev" ], gateway.deliveries.pluck(:to)
  end

  test "sandbox delivery rejects an unsafe destination before contacting the provider" do
    notification = Commerce::Notifications::QueueOrderPaid.call(order: @order).first
    gateway = FakeGateway.new
    ENV["COMMERCE_EMAIL_SANDBOX_TO"] = "customer@example.org"

    assert_raises(Commerce::Notifications::ConfigurationError) do
      Commerce::Notifications::DeliverOrder.new(notification:, gateway:, mode: "sandbox").call
    end

    assert_equal "failed", notification.reload.status
    assert_empty gateway.deliveries
  end

  test "provider failures remain retryable and retain the same idempotency key" do
    notification = Commerce::Notifications::QueueOrderPaid.call(order: @order).first
    original_key = notification.idempotency_key

    assert_raises(Commerce::Notifications::DeliveryError) do
      Commerce::Notifications::DeliverOrder.new(
        notification:,
        gateway: FakeGateway.new(fail_with: "temporary provider failure"),
        mode: "live"
      ).call
    end

    assert_equal "failed", notification.reload.status
    assert_equal 1, notification.attempts
    assert_equal original_key, notification.idempotency_key
    assert_includes notification.last_error, "temporary provider failure"
  end

  test "the recovery dispatcher requeues abandoned pending and stale delivery records" do
    pending_notification = Commerce::Notifications::QueueOrderPaid.call(order: @order).first
    pending_notification.update_column(:updated_at, 2.minutes.ago)
    stale_notification = @order.order_notifications.create!(
      kind: "operations_new_order",
      recipient: "operations@example.org",
      status: "delivering",
      subject: "Stale delivery",
      html_body: "<p>Stale</p>",
      text_body: "Stale",
      updated_at: 6.minutes.ago
    )
    sent_notification = @order.order_notifications.create!(
      kind: "operations_new_order",
      recipient: "sent@example.org",
      status: "sent",
      subject: "Already sent",
      html_body: "<p>Sent</p>",
      text_body: "Sent",
      sent_at: Time.current
    )

    DispatchPendingOrderNotificationsJob.perform_now

    queued_ids = enqueued_jobs.filter_map do |job|
      job[:args].first if job[:job] == DeliverOrderNotificationJob
    end
    assert_includes queued_ids, pending_notification.id
    assert_includes queued_ids, stale_notification.id
    refute_includes queued_ids, sent_notification.id
  end

  test "a stale failed delivery cannot overwrite a newer successful attempt" do
    notification = Commerce::Notifications::QueueOrderPaid.call(order: @order).first
    gateway = Object.new
    gateway.define_singleton_method(:deliver) do |notification:, to:|
      notification.update_columns(
        status: "sent",
        delivery_mode: "live",
        delivered_to: to,
        provider_message_id: "email_newer_attempt",
        sent_at: Time.current,
        updated_at: Time.current
      )
      raise Commerce::Notifications::DeliveryError, "late failure from stale attempt"
    end

    assert_raises(Commerce::Notifications::DeliveryError) do
      Commerce::Notifications::DeliverOrder.new(notification:, gateway:, mode: "live").call
    end

    assert_equal "sent", notification.reload.status
    assert_equal "email_newer_attempt", notification.provider_message_id
  end

  test "order lookup requires the matching order number and checkout email" do
    post "/api/v1/shop/order-lookup", params: {
      order_lookup: { number: @order.number.downcase, email: " KAI@EXAMPLE.ORG " }
    }, as: :json

    assert_response :success
    assert_equal "no-store", response.headers["Cache-Control"]
    token = response.parsed_body.fetch("order_token")
    get "/api/v1/shop/orders/#{token}"
    assert_response :success
    assert_equal @order.number, response.parsed_body.dig("order", "number")
    assert response.parsed_body.dig("order", "created_at").present?

    post "/api/v1/shop/order-lookup", params: {
      order_lookup: { number: @order.number, email: "someone-else@example.org" }
    }, as: :json
    assert_response :not_found
    assert_equal "We could not find an order matching those details.", response.parsed_body["error"]
  end

  test "the Resend gateway passes the durable idempotency key to the provider SDK" do
    notification = Commerce::Notifications::QueueOrderPaid.call(order: @order).first
    captured = nil
    original_send = Resend::Emails.method(:send)
    Resend::Emails.define_singleton_method(:send) do |params, options:|
      captured = { params:, options: }
      { id: "email_resend_test" }
    end

    message_id = Commerce::Notifications::ResendGateway.new(api_key: "re_test", from: "Marianas Open <orders@example.org>")
      .deliver(notification:, to: notification.recipient)

    assert_equal "email_resend_test", message_id
    assert_equal notification.idempotency_key, captured.dig(:options, :idempotency_key)
    assert_equal notification.recipient, captured.dig(:params, :to)
  ensure
    Resend::Emails.define_singleton_method(:send, original_send) if original_send
  end
end
