require "test_helper"

class CommerceLaunchReadinessTest < ActionDispatch::IntegrationTest
  setup do
    @organization = Organization.create!(name: "Marianas Open", slug: "marianas-open", contact_email: "support@example.org")
    @admin = User.create!(clerk_id: "launch_admin", email: "launch@example.org", role: "admin", invitation_status: "accepted")
    @headers = { "Authorization" => "Bearer test-token" }
    @location = @organization.inventory_locations.create!(
      name: "Deal Depot", code: "DEAL-DEPOT", active: true, pickup_enabled: true, shipping_enabled: true,
      address: { street1: "123 Marine Corps Drive", city: "Tamuning", state: "GU", zip: "96913", country: "US" }
    )
    @organization.shipping_packages.create!(
      name: "Apparel box", length_mm: 300, width_mm: 220, height_mm: 80,
      empty_weight_grams: 150, max_weight_grams: 4_000
    )
    product = @organization.products.create!(name: "Launch shirt", slug: "launch-shirt", active: true)
    @variant = product.product_variants.create!(
      name: "Medium", sku: "LAUNCH-SHIRT-M", price_cents: 3_500, active: true,
      allow_shipping: true, allow_pickup: true, weight_grams: 300, country_of_origin: "US"
    )
    @variant.inventory_levels.create!(inventory_location: @location, on_hand: 5)
  end

  test "staff see secret-safe automatic checks and pending launch gates" do
    get "/api/v1/admin/commerce-launch-readiness"
    assert_response :unauthorized

    with_launch_environment do
      with_verified_clerk { get "/api/v1/admin/commerce-launch-readiness", headers: @headers }
    end

    assert_response :success
    payload = response.parsed_body
    assert_equal false, payload.fetch("ready_to_enable")
    assert_equal 8, payload.dig("summary", "blockers")
    assert_equal 0, payload.dig("summary", "manual_passed")
    assert_equal 8, payload.fetch("manual_checks").length
    assert payload.fetch("automatic_checks").all? { |check| check.fetch("status") == "passed" }
    assert_not_includes response.body, "sk_test_launch_secret"
    assert_not_includes response.body, "EZTKlaunchsecret"
    assert_not_includes response.body, "whsec_launch_secret"
  end

  test "staff can sign off and reset a known manual launch gate" do
    with_launch_environment do
      with_verified_clerk do
        patch "/api/v1/admin/commerce-launch-readiness/checks/mainland_route_pilot",
          params: { check: { status: "passed", note: "USPS test package scanned and tracked on Sep 15." } },
          headers: @headers
      end
    end

    assert_response :success
    record = @organization.commerce_launch_checks.find_by!(key: "mainland_route_pilot")
    assert_equal "passed", record.status
    assert_equal @admin, record.reviewed_by
    assert record.reviewed_at.present?
    assert_equal 1, response.parsed_body.dig("summary", "manual_passed")

    with_launch_environment do
      with_verified_clerk do
        patch "/api/v1/admin/commerce-launch-readiness/checks/mainland_route_pilot",
          params: { check: { status: "pending", note: "Run again after changing the launch package." } },
          headers: @headers
      end
    end

    assert_response :success
    record.reload
    assert_equal "pending", record.status
    assert_nil record.reviewed_by
    assert_nil record.reviewed_at
  end

  test "unknown gates and invalid statuses are rejected without creating records" do
    with_verified_clerk do
      patch "/api/v1/admin/commerce-launch-readiness/checks/not-a-gate",
        params: { check: { status: "passed", note: "No" } }, headers: @headers
    end
    assert_response :not_found

    with_verified_clerk do
      patch "/api/v1/admin/commerce-launch-readiness/checks/owner_acceptance",
        params: { check: { status: "approved", note: "No" } }, headers: @headers
    end
    assert_response :unprocessable_entity
    assert_empty @organization.commerce_launch_checks

    with_verified_clerk do
      patch "/api/v1/admin/commerce-launch-readiness/checks/owner_acceptance",
        params: { check: { status: "passed", note: "   " } }, headers: @headers
    end
    assert_response :unprocessable_entity
    assert_empty @organization.commerce_launch_checks
  end

  test "missing inventory and customs data remain visible as automated blockers" do
    @variant.update!(country_of_origin: nil)
    @variant.inventory_levels.update_all(on_hand: 0)

    snapshot = Commerce::LaunchReadiness.new(organization: @organization).as_json
    checks = snapshot.fetch(:automatic_checks).index_by { |check| check.fetch(:key) }

    assert_equal "blocked", checks.fetch("shippable_variants").fetch(:status)
    assert_equal "blocked", checks.fetch("launch_inventory").fetch(:status)
    assert_includes checks.fetch("shippable_variants").fetch(:detail), "1 shippable variant"
  end

  test "production blocks disabled or unconfigured customer email delivery" do
    with_environment(
      "COMMERCE_DEPLOYMENT_ENV" => "production",
      "COMMERCE_EMAIL_DELIVERY_MODE" => "disabled",
      "RESEND_API_KEY" => nil,
      "RESEND_FROM_EMAIL" => nil,
      "MAILER_FROM_EMAIL" => nil
    ) do
      check = automatic_check("notification_mode")
      assert_equal "blocked", check.fetch(:status)
      assert_includes check.fetch(:detail), "Production requires live delivery mode"
    end

    with_environment(
      "COMMERCE_DEPLOYMENT_ENV" => "production",
      "COMMERCE_EMAIL_DELIVERY_MODE" => "live",
      "RESEND_API_KEY" => "re_launch_secret",
      "RESEND_FROM_EMAIL" => "orders@example.org"
    ) do
      check = automatic_check("notification_mode")
      assert_equal "passed", check.fetch(:status)
      assert_not_includes check.fetch(:detail), "re_launch_secret"
    end
  end

  test "staging blocks live provider credentials and outbound email" do
    with_environment(
      "COMMERCE_DEPLOYMENT_ENV" => "staging",
      "STRIPE_API_KEY" => "sk_live_launch_secret",
      "STRIPE_WEBHOOK_SECRET" => "whsec_launch_secret",
      "EASYPOST_API_KEY" => "EZAKlaunchsecret",
      "EASYPOST_WEBHOOK_SECRET" => "easypost_launch_secret",
      "COMMERCE_EMAIL_DELIVERY_MODE" => "sandbox"
    ) do
      checks = with_provider_modes(payments: "live", shipping: "production") do
        Commerce::LaunchReadiness.new(organization: @organization).as_json
          .fetch(:automatic_checks).index_by { |check| check.fetch(:key) }
      end

      assert_equal "blocked", checks.fetch("stripe_mode").fetch(:status)
      assert_equal "blocked", checks.fetch("easypost_mode").fetch(:status)
      assert_equal "blocked", checks.fetch("notification_mode").fetch(:status)
      assert_not_includes checks.to_json, "sk_live_launch_secret"
      assert_not_includes checks.to_json, "EZAKlaunchsecret"
    end
  end

  test "a recently retried callback failure blocks an otherwise signed-off launch" do
    Commerce::LaunchReadiness::MANUAL_GATES.each do |gate|
      @organization.commerce_launch_checks.create!(
        key: gate.fetch(:key), status: "passed", note: "Verified for launch.", reviewed_by: @admin, reviewed_at: Time.current
      )
    end
    event = PaymentEvent.create!(
      provider: "stripe", provider_event_id: "evt_launch_retry", event_type: "checkout.session.completed", status: "received"
    )
    event.update_columns(status: "failed", created_at: 10.days.ago, updated_at: Time.current)

    with_launch_environment do
      snapshot = Commerce::LaunchReadiness.new(organization: @organization).as_json
      check = snapshot.fetch(:automatic_checks).find { |candidate| candidate.fetch(:key) == "webhook_health" }

      assert_equal "blocked", check.fetch(:status)
      assert_equal false, snapshot.fetch(:ready_to_enable)
      assert_equal 1, snapshot.dig(:summary, :blockers)
    end
  end

  test "an unsupported deployment environment is a launch blocker" do
    with_launch_environment do
      with_environment("COMMERCE_DEPLOYMENT_ENV" => "prodution") do
        snapshot = Commerce::LaunchReadiness.new(organization: @organization).as_json
        check = snapshot.fetch(:automatic_checks).find { |candidate| candidate.fetch(:key) == "deployment_environment" }

        assert_equal "blocked", check.fetch(:status)
        assert_equal false, snapshot.fetch(:ready_to_enable)
        assert_includes check.fetch(:detail), "development, test, staging, or production"
      end
    end
  end

  private

  def with_launch_environment
    with_environment(
      "STRIPE_API_KEY" => "sk_test_launch_secret",
      "STRIPE_WEBHOOK_SECRET" => "whsec_launch_secret",
      "EASYPOST_API_KEY" => "EZTKlaunchsecret",
      "EASYPOST_WEBHOOK_SECRET" => "easypost_launch_secret",
      "COMMERCE_EMAIL_DELIVERY_MODE" => "disabled"
    ) { yield }
  end

  def automatic_check(key)
    Commerce::LaunchReadiness.new(organization: @organization).as_json
      .fetch(:automatic_checks).find { |check| check.fetch(:key) == key }
  end

  def with_environment(values)
    previous = {}
    values.each_key { |key| previous[key] = ENV[key] }
    values.each { |key, value| value.nil? ? ENV.delete(key) : ENV[key] = value }
    yield
  ensure
    previous&.each { |key, value| value.nil? ? ENV.delete(key) : ENV[key] = value }
  end

  def with_provider_modes(payments:, shipping:)
    original_payments = Commerce::Payments.method(:provider_mode)
    original_shipping = Commerce::Shipping.method(:provider_mode)
    Commerce::Payments.define_singleton_method(:provider_mode) { payments }
    Commerce::Shipping.define_singleton_method(:provider_mode) { shipping }
    yield
  ensure
    Commerce::Payments.define_singleton_method(:provider_mode, original_payments)
    Commerce::Shipping.define_singleton_method(:provider_mode, original_shipping)
  end

  def with_verified_clerk
    original_verify = ClerkAuth.method(:verify)
    ClerkAuth.define_singleton_method(:verify) { |_token| { "sub" => "launch_admin", "email" => "launch@example.org" } }
    yield
  ensure
    ClerkAuth.define_singleton_method(:verify, original_verify)
  end
end
