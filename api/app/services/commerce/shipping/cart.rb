module Commerce
  module Shipping
    class Cart
      Line = Data.define(:variant, :quantity) do
        def subtotal_cents
          variant.price_cents * quantity
        end
      end

      attr_reader :lines, :currency

      def initialize(organization:, raw_lines:, fulfillment_method: "shipping", inventory_location: nil)
        @organization = organization
        @raw_lines = Array(raw_lines)
        @fulfillment_method = fulfillment_method.to_s
        @inventory_location = inventory_location
        @lines = build_lines
        @currency = currencies.one? ? currencies.first : nil
        validate!
      end

      def subtotal_cents
        lines.sum(&:subtotal_cents)
      end

      def contents_weight_grams
        lines.sum { |line| line.variant.weight_grams * line.quantity }
      end

      def digest
        canonical = lines.sort_by { |line| line.variant.id }.map do |line|
          [ line.variant.id, line.quantity, line.variant.price_cents, line.variant.currency, line.variant.updated_at.to_i ]
        end
        Digest::SHA256.hexdigest(canonical.to_json)
      end

      def customs_items
        lines.map do |line|
          variant = line.variant
          {
            description: variant.customs_description.presence || variant.product.name,
            quantity: line.quantity,
            value: format("%.2f", variant.price_cents / 100.0),
            weight: grams_to_ounces(variant.weight_grams),
            origin_country: variant.country_of_origin,
            hs_tariff_number: variant.hts_code.presence
          }.compact
        end
      end

      private

      def build_lines
        quantities = @raw_lines.each_with_object(Hash.new(0)) do |raw, result|
          variant_id = Integer(raw[:variant_id] || raw["variant_id"], exception: false)
          quantity = Integer(raw[:quantity] || raw["quantity"], exception: false)
          raise Error, "Every cart item needs a valid variant and quantity." unless variant_id&.positive? && quantity&.positive?

          result[variant_id] += quantity
        end
        raise Error, "Your bag is empty." if quantities.empty?
        raise Error, "Your bag has too many separate items." if quantities.size > 50
        raise Error, "Your bag has too many items." if quantities.values.sum > 100

        variants = ProductVariant.joins(:product)
          .where(products: { organization_id: @organization.id, active: true })
          .available_for_sale
          .includes(:product, :inventory_levels)
          .where(id: quantities.keys)
          .index_by(&:id)

        quantities.map do |variant_id, quantity|
          variant = variants[variant_id]
          raise Error, "An item in your bag is no longer available." unless variant
          validate_fulfillment!(variant)
          available = available_quantity(variant)
          raise Error, "Only #{available} of #{variant.product.name} is available at this location." if quantity > available

          Line.new(variant:, quantity:)
        end
      end

      def validate_fulfillment!(variant)
        case @fulfillment_method
        when "shipping"
          unless variant.product.shippable? && variant.allow_shipping?
            raise Error, "#{variant.product.name} cannot be shipped."
          end
          raise Error, "#{variant.product.name} needs a shipping weight before it can be delivered." unless variant.weight_grams&.positive?
        when "pickup"
          unless variant.product.pickup_enabled? && variant.allow_pickup?
            raise Error, "#{variant.product.name} is not available for pickup."
          end
        else
          raise Error, "Choose delivery or Deal Depot pickup."
        end
      end

      def available_quantity(variant)
        return variant.available_quantity unless @inventory_location

        variant.inventory_levels.find { |level| level.inventory_location_id == @inventory_location.id }&.available.to_i
      end

      def currencies
        lines.map { |line| line.variant.currency }.uniq
      end

      def validate!
        raise Error, "Items using different currencies must be purchased separately." unless currency
      end

      def grams_to_ounces(grams)
        (grams / 28.3495).round(1)
      end
    end
  end
end
