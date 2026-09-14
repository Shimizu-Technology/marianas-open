module Commerce
  class AdminCatalogPresenter
    def initialize(product)
      @product = product
    end

    def as_json
      {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        active: product.active,
        featured: product.featured,
        shippable: product.shippable,
        pickup_enabled: product.pickup_enabled,
        sort_order: product.sort_order,
        images: product.product_images.filter_map { |image| image_payload(image) },
        options: product.product_options.map do |option|
          {
            id: option.id,
            client_key: "option-#{option.id}",
            name: option.name,
            position: option.position,
            values: option.product_option_values.map do |value|
              value.slice(:id, :value, :position).merge(client_key: "value-#{value.id}")
            end
          }
        end,
        variants: product.product_variants.map { |variant| variant_payload(variant) }
      }
    end

    private

    attr_reader :product

    def variant_payload(variant)
      {
        id: variant.id,
        name: variant.name,
        sku: variant.sku,
        active: variant.active,
        price_cents: variant.price_cents,
        compare_at_price_cents: variant.compare_at_price_cents,
        currency: variant.currency,
        allow_shipping: variant.allow_shipping,
        allow_pickup: variant.allow_pickup,
        weight_grams: variant.weight_grams,
        length_mm: variant.length_mm,
        width_mm: variant.width_mm,
        height_mm: variant.height_mm,
        customs_description: variant.customs_description,
        country_of_origin: variant.country_of_origin,
        hts_code: variant.hts_code,
        position: variant.position,
        selected_value_ids: variant.product_option_values.map(&:id),
        available_quantity: variant.available_quantity,
        inventory_levels: variant.inventory_levels.map do |level|
          {
            location_id: level.inventory_location_id,
            on_hand: level.on_hand,
            reserved: level.reserved,
            available: level.available
          }
        end
      }
    end

    def image_payload(image)
      return unless image.image.attached?

      {
        id: image.id,
        variant_id: image.product_variant_id,
        alt_text: image.alt_text,
        sort_order: image.sort_order,
        url: Rails.application.routes.url_helpers.rails_blob_url(image.image, only_path: true)
      }
    end
  end
end
