require "test_helper"

class PublicShopProductsTest < ActionDispatch::IntegrationTest
  setup do
    @previous_commerce_enabled = ENV["COMMERCE_ENABLED"]
    ENV["COMMERCE_ENABLED"] = "true"
    organization = Organization.create!(name: "Marianas Open", slug: "marianas-open")
    location = organization.inventory_locations.create!(
      name: "Deal Depot", code: "DEAL-DEPOT", pickup_enabled: true,
      address: { street1: "123 Marine Corps Drive", city: "Tamuning", state: "GU", zip: "96913", country: "US" }
    )
    @product = organization.products.create!(
      name: "Marianas Open Towel",
      slug: "marianas-open-towel",
      description: "A tournament-ready towel.",
      active: true,
      featured: true
    )
    option = @product.product_options.create!(name: "Color")
    black = option.product_option_values.create!(value: "Black")
    variant = @product.product_variants.create!(name: "Black", sku: "MO-TOWEL-BLK", price_cents: 3_500, weight_grams: 420)
    variant.product_option_values << black
    variant.update!(active: true)
    Commerce::Inventory::AdjustStock.call(variant: variant, location: location, quantity_delta: 5, reason: "received")

    organization.products.create!(name: "Hidden Product", slug: "hidden-product", active: false)
  end

  teardown do
    ENV["COMMERCE_ENABLED"] = @previous_commerce_enabled
  end

  test "lists only active products with server-owned variants and stock" do
    get "/api/v1/shop/products"

    assert_response :success
    assert_equal [ "marianas-open-towel" ], response.parsed_body.fetch("products").map { |product| product["slug"] }
    variant = response.parsed_body.dig("products", 0, "variants", 0)
    assert_equal 3_500, variant["price_cents"]
    assert_equal 5, variant["available_quantity"]
    assert_equal "Black", response.parsed_body.dig("products", 0, "options", 0, "values", 0, "value")
  end

  test "scopes products and shared slugs to the storefront organization" do
    another_organization = Organization.create!(name: "Another Seller", slug: "another-seller")
    another_organization.products.create!(name: "Other Towel", slug: @product.slug, active: true)

    get "/api/v1/shop/products"
    assert_response :success
    assert_equal [ @product.id ], response.parsed_body.fetch("products").map { |product| product["id"] }

    get "/api/v1/shop/products/#{@product.slug}"
    assert_response :success
    assert_equal @product.id, response.parsed_body.dig("product", "id")
  end

  test "returns a stable product destination and hides the shop when disabled" do
    get "/api/v1/shop/products/#{@product.slug}"
    assert_response :success
    assert_equal @product.id, response.parsed_body.dig("product", "id")

    ENV["COMMERCE_ENABLED"] = "false"
    get "/api/v1/shop/products"
    assert_response :not_found
  end

  test "exposes store availability without exposing unpublished catalog data" do
    get "/api/v1/shop/configuration"

    assert_response :success
    assert_equal true, response.parsed_body["enabled"]
    assert_equal false, response.parsed_body["fake_checkout_enabled"]
    assert_equal %w[enabled fake_checkout_enabled], response.parsed_body.keys
  end
end
