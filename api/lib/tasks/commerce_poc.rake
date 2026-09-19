namespace :commerce do
  desc "Mark PREVIEW catalog items as demo-only and add an unmeasured demo parcel (staging POC only)"
  task poc_setup: :environment do
    unless Commerce::Configuration.poc_mode?
      abort "The commerce proof-of-concept setup can only run in explicitly enabled staging POC mode."
    end

    organization = Organization.find_by!(slug: "marianas-open")
    products = organization.products.includes(:product_variants).select do |product|
      product.product_variants.any? && product.product_variants.all? { |variant| variant.sku.start_with?("PREVIEW-") }
    end
    abort "No PREVIEW-SKU products were found; refusing to create an empty demo catalog." if products.empty?
    location = organization.inventory_locations.find_by!(name: "Deal Depot", active: true, pickup_enabled: true, shipping_enabled: true)

    ApplicationRecord.transaction do
      products.each { |product| product.update!(demo_only: true) }
      products.flat_map(&:product_variants).each do |variant|
        level = variant.inventory_levels.find_by(inventory_location: location)
        available = level&.available.to_i
        next if available >= 50

        Commerce::Inventory::AdjustStock.call(
          variant:, location:, quantity_delta: 50 - available, reason: "correction",
          note: "Synthetic POC stock only; not Deal Depot physical inventory"
        )
      end
      package = organization.shipping_packages.find_or_initialize_by(name: "POC demo parcel — unmeasured")
      package.assign_attributes(
        demo_only: true, active: true, sort_order: 999,
        length_mm: 305, width_mm: 229, height_mm: 76,
        empty_weight_grams: 150, max_weight_grams: 10_000
      )
      package.save!
    end

    puts "Demo catalog: #{products.length} products with synthetic stock. Demo parcel dimensions are placeholders, not launch measurements."
  end
end
