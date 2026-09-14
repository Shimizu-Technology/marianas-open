module Commerce
  class CatalogPresenter
    def initialize(product)
      @product = product
    end

    def as_json
      {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        featured: product.featured,
        shippable: product.shippable,
        pickup_enabled: product.pickup_enabled,
        translations: product.translations,
        collections: published_collections.map { |collection| collection.slice(:id, :name, :slug) },
        images: product.product_images.filter_map { |image| image_payload(image) },
        options: product.product_options.map do |option|
          {
            id: option.id,
            name: option.name,
            values: option.product_option_values.map { |value| value.slice(:id, :value) }
          }
        end,
        variants: available_variants.map do |variant|
          {
            id: variant.id,
            name: variant.name,
            sku: variant.sku,
            price_cents: variant.price_cents,
            compare_at_price_cents: variant.compare_at_price_cents,
            currency: variant.currency,
            allow_shipping: variant.allow_shipping,
            allow_pickup: variant.allow_pickup,
            available_quantity: variant.available_quantity,
            option_value_ids: variant.product_option_values.map(&:id)
          }
        end
      }
    end

    private

    attr_reader :product

    def published_collections
      product.product_collections.select(&:active?).sort_by { |collection| [ collection.sort_order, collection.name ] }
    end

    def available_variants
      product.product_variants.select(&:active?).sort_by { |variant| [ variant.position, variant.id ] }
    end

    def image_payload(image)
      return unless image.image.attached?

      {
        id: image.id,
        variant_id: image.product_variant_id,
        alt_text: image.alt_text,
        url: Rails.application.routes.url_helpers.rails_blob_url(image.image, only_path: true)
      }
    end
  end
end
