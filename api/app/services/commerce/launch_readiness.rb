module Commerce
  class LaunchReadiness
    Check = Data.define(:key, :category, :title, :detail, :status, :fix_path)

    MANUAL_GATES = [
      { key: "seller_and_settlement", category: "Business", title: "Seller, Stripe account, and settlement ownership",
        detail: "Confirm who legally sells the merchandise, owns the Stripe account and bank settlement, appears on receipts, and handles disputes." },
      { key: "guam_tax_review", category: "Business", title: "Guam tax treatment reviewed",
        detail: "Record advice from a qualified Guam tax professional before collecting or reporting tax." },
      { key: "policies_approved", category: "Customer experience", title: "Customer policies approved",
        detail: "Approve shipping, pickup, cancellation, returns, privacy, and support language for the public shop." },
      { key: "deal_depot_handoff", category: "Deal Depot", title: "Deal Depot operating handoff complete",
        detail: "Confirm inventory ownership, packing supplies, label printer, pickup verification, returns, support, and daily order ownership." },
      { key: "guam_route_pilot", category: "Shipping pilot", title: "Guam pickup and delivery pilot passed",
        detail: "Complete a test checkout, payment, pickup or local delivery handoff, notification review, refund, and reconciliation." },
      { key: "mainland_route_pilot", category: "Shipping pilot", title: "Mainland U.S. shipping pilot passed",
        detail: "Pack a launch item, buy the quoted label, scan it with the carrier, and verify tracking and the final landed cost." },
      { key: "asia_route_pilot", category: "Shipping pilot", title: "Asia shipping pilot passed",
        detail: "Test each enabled Asia route with customs data, carrier acceptance, tracking, and final landed cost, or record that Asia is excluded from launch." },
      { key: "owner_acceptance", category: "Approval", title: "Owner accepted the staging experience",
        detail: "Steve or the designated owner reviewed the complete mobile and desktop purchase and operations flow on staging." }
    ].freeze

    def initialize(organization:)
      @organization = organization
    end

    def as_json
      automatic = automatic_checks.map { |check| check.to_h }
      manual = manual_checks
      blockers = automatic.count { |check| check[:status] == "blocked" } + manual.count { |check| check[:status] != "passed" }
      warnings = automatic.count { |check| check[:status] == "warning" }

      {
        environment: deployment_environment,
        commerce_enabled: Configuration.enabled?,
        ready_to_enable: blockers.zero?,
        summary: {
          blockers:,
          warnings:,
          automatic_passed: automatic.count { |check| check[:status] == "passed" },
          automatic_total: automatic.length,
          manual_passed: manual.count { |check| check[:status] == "passed" },
          manual_total: manual.length
        },
        automatic_checks: automatic,
        manual_checks: manual,
        generated_at: Time.current.iso8601
      }
    end

    def self.manual_gate(key)
      MANUAL_GATES.find { |gate| gate.fetch(:key) == key.to_s }
    end

    private

    attr_reader :organization

    def deployment_environment
      ENV["COMMERCE_DEPLOYMENT_ENV"].presence || Rails.env
    end

    def provider_environment?
      %w[staging production].include?(deployment_environment)
    end

    def expected_stripe_mode
      deployment_environment == "production" ? "live" : "test"
    end

    def expected_shipping_mode
      deployment_environment == "production" ? "production" : "test"
    end

    def automatic_checks
      [
        stripe_key_check,
        stripe_mode_check,
        secret_check("stripe_webhook_secret", "Payments", "Stripe webhook signing secret", "STRIPE_WEBHOOK_SECRET"),
        easy_post_key_check,
        easy_post_mode_check,
        secret_check("easypost_webhook_secret", "Shipping", "EasyPost webhook signing secret", "EASYPOST_WEBHOOK_SECRET"),
        notification_check,
        support_check,
        fulfillment_location_check,
        package_check,
        catalog_check,
        shippable_variant_check,
        inventory_check,
        webhook_health_check
      ]
    end

    def stripe_key_check
      configured = ENV["STRIPE_API_KEY"].present? || Payments.fake_checkout_enabled?
      check("stripe_api_key", "Payments", "Stripe payments configured", configured,
        configured ? "A payment gateway is available." : "Add a restricted Stripe key for this environment.")
    end

    def stripe_mode_check
      actual = Payments.provider_mode
      okay = !provider_environment? || actual == expected_stripe_mode
      check("stripe_mode", "Payments", "Stripe mode is isolated", okay,
        "Expected #{expected_stripe_mode}; detected #{actual}.")
    end

    def easy_post_key_check
      configured = ENV["EASYPOST_API_KEY"].present? ||
        (Rails.env.development? && ActiveModel::Type::Boolean.new.cast(ENV["EASYPOST_FAKE_RATES"]))
      check("easypost_api_key", "Shipping", "EasyPost rates configured", configured,
        configured ? "A shipping-rate gateway is available." : "Add an EasyPost key for this environment.", "/admin/commerce/shipping")
    end

    def easy_post_mode_check
      actual = Shipping.provider_mode
      okay = !provider_environment? || actual == expected_shipping_mode
      check("easypost_mode", "Shipping", "EasyPost mode is isolated", okay,
        "Expected #{expected_shipping_mode}; detected #{actual}.")
    end

    def secret_check(key, category, title, variable)
      configured = ENV[variable].present?
      check(key, category, title, configured,
        configured ? "Signature verification is configured." : "Add #{variable} before testing provider callbacks.")
    end

    def notification_check
      mode = Notifications.delivery_mode
      okay, detail = case deployment_environment
      when "staging"
        [ mode == "disabled", "Staging must use disabled delivery mode; detected #{mode}." ]
      when "production"
        configured = ENV["RESEND_API_KEY"].present? &&
          (ENV["RESEND_FROM_EMAIL"].presence || ENV["MAILER_FROM_EMAIL"].presence).present?
        [ mode == "live" && configured,
          mode == "live" && configured ? "Production live delivery is configured." : "Production requires live delivery mode, a Resend key, and a sender address." ]
      else
        [ true, "#{deployment_environment.capitalize} is using #{mode} delivery mode." ]
      end
      status = okay ? "passed" : "blocked"
      Check.new(key: "notification_mode", category: "Notifications", title: "Email delivery boundary is safe",
        detail:, status:, fix_path: nil)
    rescue Notifications::ConfigurationError => e
      Check.new(key: "notification_mode", category: "Notifications", title: "Email delivery boundary is safe",
        detail: e.message, status: "blocked", fix_path: nil)
    end

    def support_check
      configured = ENV["COMMERCE_SUPPORT_EMAIL"].presence || organization.contact_email.presence
      check("support_email", "Customer experience", "Support contact configured", configured.present?,
        configured.present? ? "Customers have a support address." : "Add a commerce or organization support email.", "/admin/settings")
    end

    def fulfillment_location_check
      location = shipping_location
      okay = location.present? && location.pickup_enabled? && complete_address?(location)
      detail = if location.nil?
        "Create an active Deal Depot pickup and ship-from location."
      elsif !complete_address?(location)
        "Complete Deal Depot's street, city, state, postal code, and country."
      elsif !location.pickup_enabled?
        "Enable Deal Depot pickup before launch."
      else
        "#{location.name} is active for pickup and shipping with a complete address."
      end
      check("fulfillment_location", "Deal Depot", "Fulfillment location ready", okay, detail, "/admin/commerce/shipping")
    end

    def package_check
      count = organization.shipping_packages.available.count
      check("shipping_packages", "Shipping", "Measured package preset available", count.positive?,
        count.positive? ? "#{count} active package preset#{'s' unless count == 1} available." : "Add a physically measured package preset.",
        "/admin/commerce/shipping")
    end

    def catalog_check
      products = organization.products.published
      active_variants = ProductVariant.joins(:product).where(products: { id: products.select(:id) }, active: true).count
      okay = products.exists? && active_variants.positive?
      check("published_catalog", "Catalog", "Launch catalog published", okay,
        okay ? "#{products.count} published product#{'s' unless products.count == 1} with #{active_variants} active variant#{'s' unless active_variants == 1}." : "Publish at least one product with an active variant.",
        "/admin/commerce")
    end

    def shippable_variant_check
      variants = launch_variants.where(allow_shipping: true)
      incomplete = variants.where(weight_grams: nil).or(variants.where(country_of_origin: [ nil, "" ])).distinct
      okay = variants.exists? && !incomplete.exists?
      detail = if !variants.exists?
        "Publish at least one shippable variant."
      elsif incomplete.exists?
        "#{incomplete.count} shippable variant#{'s' unless incomplete.count == 1} need weight or country of origin."
      else
        "All #{variants.count} shippable launch variants have weight and customs origin data."
      end
      check("shippable_variants", "Catalog", "Shipping data complete", okay, detail, "/admin/commerce")
    end

    def inventory_check
      location = shipping_location
      variants = launch_variants
      stocked = if location
        InventoryLevel.where(inventory_location: location, product_variant: variants).where("on_hand - reserved > 0").distinct.count(:product_variant_id)
      else
        0
      end
      okay = variants.exists? && stocked == variants.count
      check("launch_inventory", "Inventory", "Launch inventory available at Deal Depot", okay,
        variants.exists? ? "#{stocked} of #{variants.count} active launch variants have available stock." : "Publish launch variants before checking inventory.",
        "/admin/commerce")
    end

    def webhook_health_check
      recent = 7.days.ago
      failures = PaymentEvent.where(status: "failed", updated_at: recent..).count +
        ShipmentEvent.where(status: "failed", updated_at: recent..).count
      status = failures.zero? ? "passed" : "blocked"
      Check.new(key: "webhook_health", category: "Operations", title: "Provider callbacks are healthy",
        detail: failures.zero? ? "No failed Stripe or EasyPost events in the last 7 days." : "#{failures} provider event#{'s' unless failures == 1} failed in the last 7 days; review before launch.",
        status:, fix_path: "/admin/commerce/operations")
    end

    def manual_checks
      saved = organization.commerce_launch_checks.includes(:reviewed_by).index_by(&:key)
      MANUAL_GATES.map do |gate|
        record = saved[gate.fetch(:key)]
        gate.merge(
          status: record&.status || "pending",
          note: record&.note.to_s,
          reviewed_at: record&.reviewed_at&.iso8601,
          reviewed_by: record&.reviewed_by&.full_name
        )
      end
    end

    def shipping_location
      @shipping_location ||= begin
        locations = organization.inventory_locations.where(active: true, shipping_enabled: true).order(:id).to_a
        locations.find { |location| location.pickup_enabled? && complete_address?(location) } || locations.first
      end
    end

    def launch_variants
      @launch_variants ||= ProductVariant.joins(:product).where(products: { organization_id: organization.id, active: true }, active: true)
    end

    def complete_address?(location)
      %w[street1 city state zip country].all? { |key| location.address.to_h[key].present? }
    end

    def check(key, category, title, okay, detail, fix_path = nil)
      Check.new(key:, category:, title:, detail:, status: okay ? "passed" : "blocked", fix_path:)
    end
  end
end
