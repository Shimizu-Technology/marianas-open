require "test_helper"
require "timeout"

class CommerceDemoClassificationConcurrencyTest < ActionDispatch::IntegrationTest
  include ActiveJob::TestHelper

  self.use_transactional_tests = false

  setup do
    suffix = SecureRandom.hex(4)
    @organization = Organization.create!(name: "Classification race #{suffix}", slug: "classification-race-#{suffix}")
    @location = @organization.inventory_locations.create!(
      name: "Pickup", code: "PICKUP", pickup_enabled: true,
      address: { street1: "123 Marine Corps Drive", city: "Tamuning", state: "GU", zip: "96913", country: "US" }
    )
    @product = @organization.products.create!(
      name: "Race test towel", slug: "race-test-towel", active: true,
      shippable: false, pickup_enabled: true, demo_only: false
    )
    @variant = @product.product_variants.create!(
      name: "Standard", sku: "RACE-TOWEL-#{suffix}", price_cents: 2_000,
      active: true, allow_shipping: false, allow_pickup: true
    )
    @variant.inventory_levels.create!(inventory_location: @location, on_hand: 2)
  end

  teardown do
    @organization.orders.find_each do |order|
      InventoryReservation.where(order_id: order.id).delete_all
      OrderItem.where(order_id: order.id).delete_all
      order.destroy!
    end
    InventoryLevel.where(product_variant_id: @variant.id).delete_all
    @variant.reload.destroy!
    @product.reload.destroy!
    @location.reload.destroy!
    @organization.reload.destroy!
    clear_enqueued_jobs
  end

  test "an admin cannot reclassify a product while checkout commits its first order item" do
    item_created = Queue.new
    finish_checkout = Queue.new
    gateway = Object.new
    gateway.define_singleton_method(:create_checkout_session) do |order:|
      { id: "cs_test_#{order.id}", url: "https://checkout.stripe.test/#{order.number}" }
    end
    checkout = Commerce::Checkout::Create.new(
      organization: @organization,
      attributes: {
        checkout_key: SecureRandom.uuid, fulfillment_method: "pickup", pickup_location_id: @location.id,
        contact: { name: "Demo Customer", email: "demo@example.test" },
        cart: [ { variant_id: @variant.id, quantity: 1 } ]
      },
      gateway:
    )
    checkout.singleton_class.prepend(Module.new do
      define_method(:create_items!) do |order, cart|
        super(order, cart)
        item_created << true
        finish_checkout.pop
      end
    end)

    checkout_thread = Thread.new { checkout.call }
    admin_thread = nil
    begin
      Timeout.timeout(5) { item_created.pop }
      admin_started = Queue.new
      admin_thread = Thread.new do
        admin_started << true
        begin
          Commerce::SaveProduct.call(
            organization: @organization,
            attributes: { id: @product.id, demo_only: true, active: true }
          )
        rescue ActiveRecord::RecordInvalid => e
          e
        end
      end
      Timeout.timeout(5) { admin_started.pop }
      assert_nil admin_thread.join(0.2), "admin save should wait for the checkout product lock"
    ensure
      finish_checkout << true
    end

    Timeout.timeout(5) { checkout_thread.value }
    error = Timeout.timeout(5) { admin_thread.value }
    assert_instance_of ActiveRecord::RecordInvalid, error
    assert_includes error.record.errors.full_messages.join, "cannot be changed after an order"
    assert_not @product.reload.demo_only?
    assert_equal 1, @organization.orders.first.order_items.count
  ensure
    finish_checkout << true if finish_checkout && checkout_thread&.alive?
    checkout_thread&.join(1)
    admin_thread&.join(1)
  end
end
