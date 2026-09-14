module Commerce
  class SaveProduct
    class InvalidCatalog < StandardError; end

    PRODUCT_FIELDS = %w[name slug description featured shippable pickup_enabled sort_order].freeze
    VARIANT_FIELDS = %w[
      name sku price_cents compare_at_price_cents currency allow_shipping allow_pickup
      weight_grams length_mm width_mm height_mm customs_description country_of_origin hts_code position
    ].freeze

    def self.call(organization:, attributes:)
      new(organization:, attributes: attributes.to_h.deep_stringify_keys).call
    end

    def initialize(organization:, attributes:)
      @organization = organization
      @attributes = attributes
    end

    def call
      Product.transaction do
        product = find_or_build_product
        requested_product_active = truthy?(attributes["active"])

        product.assign_attributes(attributes.slice(*PRODUCT_FIELDS))
        product.active = false
        product.save!

        # Option assignments on active variants are intentionally immutable at the
        # model layer. A catalog save changes the full graph atomically, so variants
        # are made draft inside this transaction and republished after validation.
        product.product_variants.update_all(active: false) if attributes.key?("options") || attributes.key?("variants")

        value_lookup = sync_options(product)
        sync_variants(product, value_lookup)

        validate_publishable_catalog!(product) if requested_product_active

        product.update!(active: requested_product_active)
        product
      end
    end

    private

    attr_reader :organization, :attributes

    def find_or_build_product
      return organization.products.new unless attributes["id"].present?

      organization.products.find(attributes["id"])
    end

    def sync_options(product)
      lookup = {}

      Array(attributes["options"]).each_with_index do |option_data, option_index|
        option_data = option_data.to_h.deep_stringify_keys
        option = option_data["id"].present? ? product.product_options.find(option_data["id"]) : product.product_options.new
        option.assign_attributes(name: option_data["name"], position: option_data.fetch("position", option_index))
        option.save!

        Array(option_data["values"]).each_with_index do |value_data, value_index|
          value_data = value_data.to_h.deep_stringify_keys
          value = value_data["id"].present? ? option.product_option_values.find(value_data["id"]) : option.product_option_values.new
          value.assign_attributes(value: value_data["value"], position: value_data.fetch("position", value_index))
          value.save!
          lookup[value_data["client_key"].presence || "value-#{value.id}"] = value
          lookup[value.id.to_s] = value
        end
      end

      lookup
    end

    def sync_variants(product, value_lookup)
      Array(attributes["variants"]).each_with_index do |variant_data, variant_index|
        variant_data = variant_data.to_h.deep_stringify_keys
        variant = variant_data["id"].present? ? product.product_variants.find(variant_data["id"]) : product.product_variants.new
        requested_active = truthy?(variant_data["active"])
        variant.assign_attributes(variant_data.slice(*VARIANT_FIELDS))
        variant.position = variant_data.fetch("position", variant_index)
        variant.active = false
        variant.save!

        selected_values = selected_values_for(product, variant_data, value_lookup)
        variant.product_variant_option_values.destroy_all
        selected_values.each { |value| variant.product_variant_option_values.create!(product_option_value: value) }
        variant.update!(active: requested_active)
      end
    end

    def selected_values_for(product, variant_data, value_lookup)
      keys = Array(variant_data["selected_value_keys"]).presence || Array(variant_data["selected_value_ids"]).map(&:to_s)
      values = keys.map { |key| value_lookup[key.to_s] || product.product_option_values.find_by(id: key) }
      raise InvalidCatalog, "Every selected option value must belong to this product" if values.any?(&:nil?)

      values
    end

    def truthy?(value)
      ActiveModel::Type::Boolean.new.cast(value)
    end

    def validate_publishable_catalog!(product)
      variants = product.product_variants.reload.select(&:active?)
      raise InvalidCatalog, "Publish at least one complete, active variant before publishing this product" if variants.empty?

      if product.shippable? && variants.none?(&:allow_shipping?)
        raise InvalidCatalog, "At least one active variant must allow shipping"
      end
      if product.pickup_enabled? && variants.none?(&:allow_pickup?)
        raise InvalidCatalog, "At least one active variant must allow pickup"
      end
      if variants.any? { |variant| variant.allow_shipping? && variant.weight_grams.blank? }
        raise InvalidCatalog, "Every shippable active variant needs a weight before the product can be published"
      end
    end
  end
end
