require "test_helper"

class ShopShippingQuotesTest < ActionDispatch::IntegrationTest
  class FakeGateway
    attr_reader :request

    def quote(**request)
      @request = request
      {
        address: request.fetch(:to_address).merge(street1: "1600 PENNSYLVANIA AVE NW", zip: "20500-0003"),
        messages: [],
        shipment_id: "shp_test_123",
        rates: [
          { id: "rate_test_priority", carrier: "USPS", service: "Priority", amount_cents: 1_450, currency: "USD", delivery_days: 4, delivery_date: nil },
          { id: "rate_test_express", carrier: "USPS", service: "PriorityExpress", amount_cents: 3_200, currency: "USD", delivery_days: 2, delivery_date: nil }
        ]
      }
    end
  end

  setup do
    @organization = Organization.create!(name: "Marianas Open", slug: "marianas-open")
    @location = @organization.inventory_locations.create!(
      name: "Deal Depot", code: "DEAL-DEPOT", pickup_enabled: true, shipping_enabled: true,
      pickup_instructions: "Wait for the ready email.", phone: "671-555-0100",
      address: { street1: "123 Marine Corps Drive", city: "Tamuning", state: "GU", zip: "96913", country: "US" }
    )
    @package = @organization.shipping_packages.create!(
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
    @variant.inventory_levels.create!(inventory_location: @location, on_hand: 8)
    @previous_commerce = ENV["COMMERCE_ENABLED"]
    ENV["COMMERCE_ENABLED"] = "true"
  end

  teardown do
    ENV["COMMERCE_ENABLED"] = @previous_commerce
  end

  test "checkout exposes public pickup instructions without internal inventory data" do
    get "/api/v1/shop/fulfillment"

    assert_response :success
    assert response.parsed_body["shipping_available"]
    pickup = response.parsed_body.fetch("pickup_locations").first
    assert_equal "Deal Depot", pickup["name"]
    assert_equal "GU", pickup.dig("address", "state")
    assert_not pickup.key?("code")
  end

  test "server verifies the cart and creates signed EasyPost rate references" do
    gateway = FakeGateway.new

    with_gateway(gateway) do
      post "/api/v1/shop/shipping-quotes", params: quote_payload, as: :json
    end

    assert_response :created
    body = response.parsed_body
    assert_equal 3_500, body["subtotal_cents"]
    assert_equal "1600 PENNSYLVANIA AVE NW", body.dig("address", "street1")
    assert_equal [ 1_450, 3_200 ], body.fetch("rates").pluck("amount_cents")
    quote = ShippingQuote.find_checkout_token!(body.dig("rates", 0, "token"))
    assert_equal "rate_test_priority", quote.provider_rate_id
    assert_equal 1_450, quote.amount_cents
    assert_equal 9.0, gateway.request.dig(:parcel, :width)
    assert gateway.request.fetch(:customs_items).any?, "Guam shipments should include customs data"
  end

  test "client-supplied quantities cannot exceed current inventory" do
    payload = quote_payload
    payload[:shipping_quote][:cart][0][:quantity] = 50

    with_gateway(FakeGateway.new) do
      post "/api/v1/shop/shipping-quotes", params: payload, as: :json
    end

    assert_response :unprocessable_entity
    assert_includes response.parsed_body.fetch("error"), "Only 8"
    assert_equal 0, ShippingQuote.count
  end

  test "off-island delivery identifies missing customs information before calling EasyPost" do
    @variant.update!(country_of_origin: nil)

    with_gateway(FakeGateway.new) do
      post "/api/v1/shop/shipping-quotes", params: quote_payload, as: :json
    end

    assert_response :unprocessable_entity
    assert_includes response.parsed_body.fetch("error"), "country of origin"
  end

  private

  def with_gateway(gateway)
    original_gateway = Commerce::Shipping.method(:gateway)
    Commerce::Shipping.define_singleton_method(:gateway) { gateway }
    yield
  ensure
    Commerce::Shipping.define_singleton_method(:gateway, original_gateway)
  end

  def quote_payload
    {
      shipping_quote: {
        cart: [ { variant_id: @variant.id, quantity: 1 } ],
        address: {
          name: "Test Customer", street1: "1600 Pennsylvania Avenue NW",
          city: "Washington", state: "DC", zip: "20500", country: "US",
          email: "customer@example.com"
        }
      }
    }
  end
end
