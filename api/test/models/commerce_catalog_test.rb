require "test_helper"

class CommerceCatalogTest < ActiveSupport::TestCase
  setup do
    @organization = Organization.create!(name: "Marianas Open", slug: "marianas-open")
    @product = @organization.products.create!(
      name: "Marianas Competition Gi",
      slug: "marianas-competition-gi",
      active: true,
      shippable: true,
      pickup_enabled: true
    )
    @size = @product.product_options.create!(name: "Gi Size", position: 1)
    @a2 = @size.product_option_values.create!(value: "A2", position: 1)
    @variant = @product.product_variants.create!(
      name: "A2 / Black",
      sku: "MO-GI-BLK-A2",
      price_cents: 14_900,
      weight_grams: 1_850,
      customs_description: "Brazilian jiu-jitsu uniform",
      country_of_origin: "pk",
      hts_code: "6203199020"
    )
    @variant.product_option_values << @a2
    @variant.update!(active: true)
    @location = @organization.inventory_locations.create!(
      name: "Deal Depot", code: "deal-depot", pickup_enabled: true,
      address: { street1: "123 Marine Corps Drive", city: "Tamuning", state: "GU", zip: "96913", country: "US" }
    )
  end

  test "supports arbitrary product options and normalizes commerce identifiers" do
    assert_equal [ "Gi Size" ], @product.product_options.map(&:name)
    assert_equal [ "A2" ], @variant.product_option_values.map(&:value)
    assert_equal "USD", @variant.currency
    assert_equal "PK", @variant.country_of_origin
    assert_equal "MO-GI-BLK-A2", @variant.sku
    assert_equal "DEAL-DEPOT", @location.code
  end

  test "allows only one value from each option on a variant" do
    a3 = @size.product_option_values.create!(value: "A3", position: 2)

    error = assert_raises(ActiveRecord::RecordInvalid) do
      @variant.product_option_values << a3
    end

    assert_includes error.message, "Product option has already been taken"
  end

  test "inventory adjustments are transactional and auditable" do
    movement = Commerce::Inventory::AdjustStock.call(
      variant: @variant,
      location: @location,
      quantity_delta: 12,
      reason: "received",
      note: "Opening count"
    )

    assert_equal 12, @variant.inventory_levels.find_by!(inventory_location: @location).available
    assert_equal 12, movement.balance_after
    assert_equal "Opening count", movement.note

    assert_raises(ActiveRecord::RecordInvalid) do
      Commerce::Inventory::AdjustStock.call(
        variant: @variant,
        location: @location,
        quantity_delta: -13,
        reason: "correction"
      )
    end

    assert_equal 12, @variant.inventory_levels.find_by!(inventory_location: @location).on_hand
    assert_equal 1, @variant.inventory_movements.count
  end

  test "adjusts an existing inventory level without creating a duplicate" do
    Commerce::Inventory::AdjustStock.call(
      variant: @variant,
      location: @location,
      quantity_delta: 5,
      reason: "received"
    )

    Commerce::Inventory::AdjustStock.call(
      variant: @variant,
      location: @location,
      quantity_delta: 2,
      reason: "received"
    )

    assert_equal 1, @variant.inventory_levels.where(inventory_location: @location).count
    assert_equal 7, @variant.inventory_levels.find_by!(inventory_location: @location).on_hand
    assert_equal 2, @variant.inventory_movements.count
  end

  test "inventory movements can only be created through the service and cannot be changed" do
    direct_movement = InventoryMovement.new(
      product_variant: @variant,
      inventory_location: @location,
      reason: "received",
      quantity_delta: 1,
      balance_after: 1
    )
    assert_not direct_movement.valid?

    movement = Commerce::Inventory::AdjustStock.call(
      variant: @variant,
      location: @location,
      quantity_delta: 1,
      reason: "received"
    )

    assert_raises(ActiveRecord::ReadOnlyRecord) { movement.update!(note: "Changed") }
    assert_raises(ActiveRecord::ReadOnlyRecord) { movement.destroy! }
  end

  test "rejects variants using another product's option value" do
    other_product = @organization.products.create!(name: "Towel", slug: "towel")
    material = other_product.product_options.create!(name: "Material")
    cotton = material.product_option_values.create!(value: "Cotton")

    error = assert_raises(ActiveRecord::RecordInvalid) do
      @variant.product_option_values << cotton
    end

    assert_includes error.message, "must belong to the variant's product"
  end

  test "requires every product and variant to have a fulfillment path" do
    @product.update!(shippable: false, pickup_enabled: true)
    @variant.allow_shipping = true

    assert_not @variant.valid?
    assert_includes @variant.errors[:allow_shipping], "cannot be enabled for a pickup-only product"

    @product.assign_attributes(shippable: false, pickup_enabled: false)
    assert_not @product.valid?
  end

  test "requires a complete option selection before activating a variant" do
    color = @product.product_options.build(name: "Color")
    assert_not color.valid?

    @variant.update!(active: false)
    color.save!
    assert_not @variant.update(active: true)
    assert_includes @variant.errors[:product_option_values], "must select one value for every product option before activation"

    black = color.product_option_values.create!(value: "Black")
    @variant.product_option_values << black
    @variant.update!(active: true)
    assert @variant.active?

    assignment = @variant.product_variant_option_values.find_by!(product_option: color)
    assert_not assignment.destroy
  end

  test "does not allow products or collections to move between organizations" do
    collection = @organization.product_collections.create!(name: "Featured", slug: "featured")
    collection.products << @product
    other_organization = Organization.create!(name: "Other Seller", slug: "other-seller")

    assert_not @product.update(organization: other_organization)
    assert_not collection.update(organization: other_organization)
    assert_equal @organization, @product.reload.organization
    assert_equal @organization, collection.reload.organization
  end

  test "rejects inventory from another organization's location" do
    other_organization = Organization.create!(name: "Other Seller", slug: "other-seller")
    other_location = other_organization.inventory_locations.create!(name: "Other Warehouse", code: "OTHER")

    level = @variant.inventory_levels.new(inventory_location: other_location, on_hand: 1)

    assert_not level.valid?
    assert_includes level.errors[:inventory_location], "must belong to the product's organization"
  end

  test "deletes variant option links before deleting product options" do
    disposable = @organization.products.create!(name: "Disposable", slug: "disposable")
    option = disposable.product_options.create!(name: "Size")
    value = option.product_option_values.create!(value: "One size")
    variant = disposable.product_variants.create!(name: "One size", sku: "DISPOSABLE-ONE", price_cents: 100)
    variant.product_option_values << value

    assert_difference "ProductVariantOptionValue.count", -1 do
      disposable.destroy!
    end
  end
end
