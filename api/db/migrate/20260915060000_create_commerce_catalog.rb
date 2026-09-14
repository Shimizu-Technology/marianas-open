class CreateCommerceCatalog < ActiveRecord::Migration[8.1]
  def change
    create_table :product_collections do |t|
      t.references :organization, null: false, foreign_key: true
      t.string :name, null: false
      t.string :slug, null: false
      t.text :description, null: false, default: ""
      t.boolean :active, null: false, default: false
      t.integer :sort_order, null: false, default: 0
      t.timestamps

      t.index %i[organization_id slug], unique: true
      t.index %i[organization_id active sort_order]
    end

    create_table :products do |t|
      t.references :organization, null: false, foreign_key: true
      t.string :name, null: false
      t.string :slug, null: false
      t.text :description, null: false, default: ""
      t.boolean :active, null: false, default: false
      t.boolean :featured, null: false, default: false
      t.boolean :shippable, null: false, default: true
      t.boolean :pickup_enabled, null: false, default: true
      t.integer :sort_order, null: false, default: 0
      t.jsonb :translations, null: false, default: {}
      t.timestamps

      t.index %i[organization_id slug], unique: true
      t.index %i[organization_id active sort_order]
    end

    create_table :product_collection_memberships do |t|
      t.references :product_collection, null: false, foreign_key: true, index: false
      t.references :product, null: false, foreign_key: true, index: false
      t.integer :sort_order, null: false, default: 0
      t.timestamps

      t.index %i[product_collection_id product_id], unique: true, name: "idx_collection_memberships_unique"
      t.index %i[product_id product_collection_id], name: "idx_collection_memberships_product"
    end

    create_table :product_options do |t|
      t.references :product, null: false, foreign_key: true
      t.string :name, null: false
      t.integer :position, null: false, default: 0
      t.timestamps

      t.index %i[product_id name], unique: true
      t.index %i[product_id position]
    end

    create_table :product_option_values do |t|
      t.references :product_option, null: false, foreign_key: true
      t.string :value, null: false
      t.integer :position, null: false, default: 0
      t.timestamps

      t.index %i[product_option_id value], unique: true, name: "idx_product_option_values_unique"
      t.index %i[product_option_id position], name: "idx_product_option_values_position"
    end

    create_table :product_variants do |t|
      t.references :product, null: false, foreign_key: true
      t.string :name, null: false
      t.string :sku, null: false
      t.integer :price_cents, null: false
      t.integer :compare_at_price_cents
      t.string :currency, null: false, default: "USD", limit: 3
      t.boolean :active, null: false, default: true
      t.boolean :allow_shipping, null: false, default: true
      t.boolean :allow_pickup, null: false, default: true
      t.integer :weight_grams
      t.integer :length_mm
      t.integer :width_mm
      t.integer :height_mm
      t.string :customs_description
      t.string :country_of_origin, limit: 2
      t.string :hts_code, limit: 12
      t.integer :position, null: false, default: 0
      t.timestamps

      t.index :sku, unique: true
      t.index %i[product_id active position]
      t.check_constraint "price_cents >= 0", name: "product_variants_price_nonnegative"
      t.check_constraint "compare_at_price_cents IS NULL OR compare_at_price_cents >= price_cents", name: "product_variants_compare_price_valid"
      t.check_constraint "weight_grams IS NULL OR weight_grams > 0", name: "product_variants_weight_positive"
      t.check_constraint "length_mm IS NULL OR length_mm > 0", name: "product_variants_length_positive"
      t.check_constraint "width_mm IS NULL OR width_mm > 0", name: "product_variants_width_positive"
      t.check_constraint "height_mm IS NULL OR height_mm > 0", name: "product_variants_height_positive"
    end

    create_table :product_variant_option_values do |t|
      t.references :product_variant, null: false, foreign_key: true, index: false
      t.references :product_option, null: false, foreign_key: true, index: false
      t.references :product_option_value, null: false, foreign_key: true, index: false
      t.timestamps

      t.index %i[product_variant_id product_option_value_id], unique: true, name: "idx_variant_option_values_unique"
      t.index %i[product_variant_id product_option_id], unique: true, name: "idx_variant_option_values_one_per_option"
      t.index :product_option_value_id, name: "idx_variant_option_values_value"
    end

    create_table :product_images do |t|
      t.references :product, null: false, foreign_key: true
      t.references :product_variant, foreign_key: true
      t.string :alt_text, null: false, default: ""
      t.integer :sort_order, null: false, default: 0
      t.timestamps

      t.index %i[product_id sort_order]
    end

    create_table :inventory_locations do |t|
      t.references :organization, null: false, foreign_key: true
      t.string :name, null: false
      t.string :code, null: false
      t.boolean :active, null: false, default: true
      t.boolean :pickup_enabled, null: false, default: false
      t.jsonb :address, null: false, default: {}
      t.timestamps

      t.index %i[organization_id code], unique: true
    end

    create_table :inventory_levels do |t|
      t.references :product_variant, null: false, foreign_key: true, index: false
      t.references :inventory_location, null: false, foreign_key: true, index: false
      t.integer :on_hand, null: false, default: 0
      t.integer :reserved, null: false, default: 0
      t.timestamps

      t.index %i[product_variant_id inventory_location_id], unique: true, name: "idx_inventory_levels_unique"
      t.index :inventory_location_id
      t.check_constraint "on_hand >= 0", name: "inventory_levels_on_hand_nonnegative"
      t.check_constraint "reserved >= 0", name: "inventory_levels_reserved_nonnegative"
      t.check_constraint "reserved <= on_hand", name: "inventory_levels_reserved_within_stock"
    end

    create_table :inventory_movements do |t|
      t.references :product_variant, null: false, foreign_key: true
      t.references :inventory_location, null: false, foreign_key: true
      t.references :performed_by, foreign_key: { to_table: :users }
      t.string :reason, null: false
      t.integer :quantity_delta, null: false
      t.integer :balance_after, null: false
      t.text :note, null: false, default: ""
      t.timestamps

      t.index %i[product_variant_id inventory_location_id created_at], name: "idx_inventory_movements_timeline"
      t.check_constraint "quantity_delta <> 0", name: "inventory_movements_delta_nonzero"
      t.check_constraint "balance_after >= 0", name: "inventory_movements_balance_nonnegative"
    end
  end
end
