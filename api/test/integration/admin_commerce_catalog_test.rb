require "test_helper"

class AdminCommerceCatalogTest < ActionDispatch::IntegrationTest
  setup do
    @organization = Organization.create!(name: "Marianas Open", slug: "marianas-open")
    @admin = User.create!(
      clerk_id: "commerce_admin",
      email: "commerce@example.com",
      role: "admin",
      invitation_status: "accepted"
    )
    @headers = { "Authorization" => "Bearer test-token" }
  end

  test "staff can atomically create a flexible product catalog graph" do
    payload = {
      product: {
        name: "Marianas Competition Gi",
        slug: "marianas-competition-gi",
        description: "A durable competition gi.",
        active: true,
        featured: true,
        shippable: true,
        pickup_enabled: true,
        options: [
          {
            client_key: "size",
            name: "Gi size",
            values: [
              { client_key: "a2", value: "A2" },
              { client_key: "a3", value: "A3" }
            ]
          },
          {
            client_key: "color",
            name: "Color",
            values: [ { client_key: "black", value: "Black" } ]
          }
        ],
        variants: [
          {
            name: "A2 / Black",
            sku: "MO-GI-A2-BLK",
            price_cents: 14_900,
            active: true,
            allow_shipping: true,
            allow_pickup: true,
            weight_grams: 1_850,
            selected_value_keys: %w[a2 black]
          }
        ]
      }
    }

    with_verified_clerk do
      post "/api/v1/admin/products", params: payload, headers: @headers, as: :json
    end

    assert_response :created
    product = Product.find(response.parsed_body.dig("product", "id"))
    assert product.active?
    assert_equal %w[Gi\ size Color], product.product_options.map(&:name)
    assert_equal %w[A2 Black], product.product_variants.first.product_option_values.map(&:value)
    assert product.product_variants.first.active?
  end

  test "new products in POC mode default to the simulated catalog" do
    previous_enabled = ENV["COMMERCE_ENABLED"]
    ENV["COMMERCE_ENABLED"] = "true"

    with_poc_mode do
      with_verified_clerk do
        post "/api/v1/admin/products", params: { product: {
          name: "Preview hat", slug: "preview-hat", active: true,
          shippable: true, pickup_enabled: true,
          variants: [ { name: "Standard", sku: "PREVIEW-HAT", price_cents: 4_000,
                        active: true, weight_grams: 250, allow_shipping: true, allow_pickup: true } ]
        } }, headers: @headers, as: :json
      end

      assert_response :created
      assert_equal true, response.parsed_body.dig("product", "demo_only")
      assert Product.find_by!(slug: "preview-hat").demo_only?

      get "/api/v1/shop/products"
      assert_response :success
      assert_includes response.parsed_body.fetch("products").map { |product| product.fetch("slug") }, "preview-hat"
    end
  ensure
    ENV["COMMERCE_ENABLED"] = previous_enabled
  end

  test "staff can classify an existing product as demo-only before it receives an order" do
    product = create_product

    with_verified_clerk do
      patch "/api/v1/admin/products/#{product.id}",
        params: { product: { demo_only: true, active: false } }, headers: @headers, as: :json
    end

    assert_response :success
    assert_equal true, response.parsed_body.dig("product", "demo_only")
    assert product.reload.demo_only?
  end

  test "demo-only classification cannot change after an order" do
    product = create_product
    location = @organization.inventory_locations.create!(name: "Deal Depot", code: "DEAL-DEPOT")
    order = @organization.orders.create!(
      inventory_location: location, checkout_key: SecureRandom.uuid,
      status: "pending_payment", fulfillment_method: "pickup",
      customer_name: "Demo Customer", customer_email: "demo@example.test",
      currency: "USD", payment_expires_at: 30.minutes.from_now,
      subtotal_cents: 3_500, shipping_cents: 0, tax_cents: 0, total_cents: 3_500
    )
    order.order_items.create!(
      product:, product_variant: product.product_variants.first,
      product_name: product.name, variant_name: "Standard", sku: "TOWEL-STD",
      currency: "USD", unit_price_cents: 3_500, line_total_cents: 3_500, quantity: 1
    )

    assert_not product.update(demo_only: true)
    assert_includes product.errors.full_messages.join, "cannot be changed after an order"
  end

  test "publishing fails atomically when a variant does not select every option" do
    payload = {
      product: {
        name: "Incomplete shirt",
        slug: "incomplete-shirt",
        active: true,
        options: [
          { client_key: "size", name: "Size", values: [ { client_key: "medium", value: "M" } ] },
          { client_key: "color", name: "Color", values: [ { client_key: "black", value: "Black" } ] }
        ],
        variants: [
          { name: "Medium", sku: "INCOMPLETE-M", price_cents: 3_000, active: true, selected_value_keys: [ "medium" ] }
        ]
      }
    }

    assert_no_difference "Product.count" do
      with_verified_clerk do
        post "/api/v1/admin/products", params: payload, headers: @headers, as: :json
      end
    end

    assert_response :unprocessable_entity
    assert response.parsed_body.fetch("errors").join.include?("select one value for every product option")
  end

  test "publishing a shippable product requires shipping-ready variant data" do
    payload = {
      product: {
        name: "Unmeasured bag",
        slug: "unmeasured-bag",
        active: true,
        shippable: true,
        pickup_enabled: true,
        options: [],
        variants: [
          {
            name: "Standard",
            sku: "UNMEASURED-BAG",
            price_cents: 4_000,
            active: true,
            allow_shipping: true,
            allow_pickup: true,
            selected_value_keys: []
          }
        ]
      }
    }

    assert_no_difference "Product.count" do
      with_verified_clerk do
        post "/api/v1/admin/products", params: payload, headers: @headers, as: :json
      end
    end

    assert_response :unprocessable_entity
    assert_includes response.parsed_body.fetch("errors"), "Every shippable active variant needs a weight before the product can be published"
  end

  test "staff can create a location and record an audited stock adjustment" do
    product = create_product

    with_verified_clerk do
      post "/api/v1/admin/inventory-locations",
        params: { inventory_location: {
          name: "Deal Depot", code: "deal-depot", pickup_enabled: true,
          address: { street1: "123 Marine Corps Drive", city: "Tamuning", state: "GU", zip: "96913", country: "US" }
        } },
        headers: @headers,
        as: :json
    end
    assert_response :created
    location_id = response.parsed_body.dig("inventory_location", "id")

    with_verified_clerk do
      post "/api/v1/admin/products/#{product.id}/inventory-adjustments",
        params: {
          inventory_adjustment: {
            variant_id: product.product_variants.first.id,
            location_id: location_id,
            quantity_delta: 12,
            reason: "received",
            note: "Opening count"
          }
        },
        headers: @headers,
        as: :json
    end

    assert_response :created
    assert_equal 12, response.parsed_body.dig("inventory", "available")
    movement = InventoryMovement.last
    assert_equal @admin, movement.performed_by
    assert_equal "Opening count", movement.note
  end

  test "admin commerce endpoints require authentication" do
    get "/api/v1/admin/products"
    assert_response :unauthorized
  end

  test "staff can configure and archive shipping packages" do
    with_verified_clerk do
      post "/api/v1/admin/shipping-packages", params: {
        shipping_package: {
          name: "Apparel box", length_mm: 305, width_mm: 229, height_mm: 76,
          empty_weight_grams: 150, max_weight_grams: 4_500, active: true
        }
      }, headers: @headers, as: :json
    end

    assert_response :created
    package_id = response.parsed_body.dig("shipping_package", "id")

    with_verified_clerk do
      patch "/api/v1/admin/shipping-packages/#{package_id}",
        params: { shipping_package: { active: false } }, headers: @headers, as: :json
    end

    assert_response :success
    assert_not response.parsed_body.dig("shipping_package", "active")
  end

  test "a customer-facing location requires a complete address" do
    with_verified_clerk do
      post "/api/v1/admin/inventory-locations",
        params: { inventory_location: { name: "Incomplete pickup", code: "INCOMPLETE", pickup_enabled: true } },
        headers: @headers,
        as: :json
    end

    assert_response :unprocessable_entity
    assert_includes response.parsed_body.fetch("errors").join, "Address is missing"
  end

  test "public configuration can safely announce whether the store is available" do
    previous = ENV["COMMERCE_ENABLED"]
    ENV["COMMERCE_ENABLED"] = "false"
    get "/api/v1/shop/configuration"
    assert_response :success
    assert_equal false, response.parsed_body["enabled"]
    assert_equal false, response.parsed_body["fake_checkout_enabled"]
  ensure
    ENV["COMMERCE_ENABLED"] = previous
  end

  private

  def create_product
    product = @organization.products.create!(name: "Towel", slug: "towel")
    variant = product.product_variants.create!(name: "Standard", sku: "TOWEL-STD", price_cents: 3_500)
    variant.update!(active: true)
    product
  end

  def with_verified_clerk
    original_verify = ClerkAuth.method(:verify)
    ClerkAuth.define_singleton_method(:verify) do |_token|
      { "sub" => "commerce_admin", "email" => "commerce@example.com" }
    end
    yield
  ensure
    ClerkAuth.define_singleton_method(:verify, original_verify)
  end

  def with_poc_mode
    original = Commerce::Configuration.method(:poc_mode?)
    Commerce::Configuration.define_singleton_method(:poc_mode?) { true }
    yield
  ensure
    Commerce::Configuration.define_singleton_method(:poc_mode?, original)
  end
end
