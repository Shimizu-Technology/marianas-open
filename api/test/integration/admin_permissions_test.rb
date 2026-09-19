require "test_helper"

class AdminPermissionsTest < ActionDispatch::IntegrationTest
  setup do
    @organization = Organization.create!(name: "Marianas Open", slug: "marianas-open")
    %w[admin events_admin merchandise_admin fulfillment_staff staff viewer].each do |role|
      User.create!(clerk_id: "role_#{role}", email: "#{role}@example.test", role:, invitation_status: "accepted")
    end
    @headers = { "Authorization" => "Bearer test-token" }
  end

  test "scoped roles can open only their assigned admin APIs" do
    cases = {
      "admin" => [ 200, 200, 200, 200, 200, 200 ],
      "events_admin" => [ 200, 403, 403, 403, 403, 403 ],
      "staff" => [ 200, 403, 403, 403, 403, 403 ],
      "merchandise_admin" => [ 403, 200, 200, 200, 200, 403 ],
      "fulfillment_staff" => [ 403, 403, 200, 200, 403, 403 ],
      "viewer" => [ 403, 403, 403, 403, 403, 403 ]
    }
    paths = %w[
      /api/v1/admin/events /api/v1/admin/products /api/v1/admin/inventory-snapshot
      /api/v1/admin/orders /api/v1/admin/commerce-operations /api/v1/admin/users
    ]

    cases.each do |role, expected|
      with_role(role) do
        paths.zip(expected).each do |path, code|
          get path, headers: @headers
          assert_equal code, response.status, "#{role} GET #{path}"
        end
      end
    end
  end

  test "fulfillment staff cannot mutate catalog, settings, events, or refunds" do
    product = @organization.products.create!(name: "Towel", slug: "towel")
    with_role("fulfillment_staff") do
      patch "/api/v1/admin/products/#{product.id}", params: { product: { active: false } }, headers: @headers, as: :json
      assert_response :forbidden
      post "/api/v1/admin/shipping-packages", params: { shipping_package: { name: "Box" } }, headers: @headers, as: :json
      assert_response :forbidden
      post "/api/v1/admin/events", params: { event: { name: "Other" } }, headers: @headers, as: :json
      assert_response :forbidden
      post "/api/v1/admin/orders/1/refunds", params: { refund: { amount_cents: 100 } }, headers: @headers, as: :json
      assert_response :forbidden
      post "/api/v1/admin/inventory-locations", params: { inventory_location: { name: "Other" } }, headers: @headers, as: :json
      assert_response :forbidden
      get "/api/v1/admin/inventory-locations", headers: @headers
      assert_response :forbidden
    end
  end

  test "last full admin cannot be demoted" do
    admin = User.find_by!(role: "admin")
    with_role("admin") do
      patch "/api/v1/admin/users/#{admin.id}", params: { role: "events_admin" }, headers: @headers, as: :json
    end
    assert_response :unprocessable_entity
    assert admin.reload.admin?
  end

  test "fulfillment order responses omit prices, refunds, and payment details" do
    location = @organization.inventory_locations.create!(name: "Deal Depot", code: "DEAL-DEPOT")
    product = @organization.products.create!(name: "Towel", slug: "towel")
    variant = product.product_variants.create!(name: "Standard", sku: "TOWEL-STD", price_cents: 3_500)
    order = @organization.orders.create!(
      inventory_location: location, checkout_key: SecureRandom.uuid, status: "paid",
      fulfillment_method: "pickup", customer_name: "Test Customer", customer_email: "customer@example.test",
      currency: "USD", payment_expires_at: 30.minutes.from_now,
      subtotal_cents: 3_500, shipping_cents: 0, tax_cents: 0, total_cents: 3_500
    )
    order.order_items.create!(
      product:, product_variant: variant, product_name: "Towel", variant_name: "Standard",
      sku: "TOWEL-STD", currency: "USD", unit_price_cents: 3_500, line_total_cents: 3_500, quantity: 1
    )

    with_role("fulfillment_staff") do
      get "/api/v1/admin/orders/#{order.id}", headers: @headers
      assert_response :success
      payload = response.parsed_body.fetch("order")
      assert_equal "Towel", payload.fetch("items").first.fetch("product_name")
      assert_equal "Test Customer", payload.fetch("customer_name")
      %w[total_cents subtotal_cents shipping_cents tax_cents refunded_cents refundable_cents refunds payment_error].each do |field|
        assert_not payload.key?(field), field
      end
      assert_not payload.fetch("items").first.key?("unit_price_cents")
    end

    with_role("merchandise_admin") do
      get "/api/v1/admin/orders/#{order.id}", headers: @headers
      assert_response :success
      assert_equal 3_500, response.parsed_body.dig("order", "total_cents")
    end
  end

  test "inventory snapshot includes stock but not catalog pricing" do
    location = @organization.inventory_locations.create!(name: "Deal Depot", code: "DEAL-DEPOT")
    product = @organization.products.create!(name: "Towel", slug: "towel", active: true)
    variant = product.product_variants.create!(name: "Standard", sku: "TOWEL-STD", price_cents: 3_500, active: true)
    variant.inventory_levels.create!(inventory_location: location, on_hand: 8, reserved: 2)

    with_role("fulfillment_staff") do
      get "/api/v1/admin/inventory-snapshot", headers: @headers
    end
    assert_response :success
    variant_payload = response.parsed_body.dig("products", 0, "variants", 0)
    assert_equal 6, variant_payload.dig("inventory_levels", 0, "available")
    assert_not variant_payload.key?("price_cents")
  end

  test "unverified request is unauthorized rather than forbidden" do
    get "/api/v1/admin/products"
    assert_response :unauthorized
  end

  private

  def with_role(role)
    previous = ClerkAuth.method(:verify)
    ClerkAuth.define_singleton_method(:verify) do |_token|
      { "sub" => "role_#{role}", "email" => "#{role}@example.test" }
    end
    yield
  ensure
    ClerkAuth.define_singleton_method(:verify, previous)
  end
end
