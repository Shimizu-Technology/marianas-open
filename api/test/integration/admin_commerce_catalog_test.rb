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
        params: { inventory_location: { name: "Deal Depot", code: "deal-depot", pickup_enabled: true } },
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

  test "public configuration can safely announce whether the store is available" do
    previous = ENV["COMMERCE_ENABLED"]
    ENV["COMMERCE_ENABLED"] = "false"
    get "/api/v1/shop/configuration"
    assert_response :success
    assert_equal false, response.parsed_body["enabled"]
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
end
