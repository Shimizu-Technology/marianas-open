class AddCommerceFulfillment < ActiveRecord::Migration[8.1]
  def change
    add_column :inventory_locations, :shipping_enabled, :boolean, null: false, default: false
    add_column :inventory_locations, :pickup_instructions, :text, null: false, default: ""
    add_column :inventory_locations, :phone, :string

    create_table :shipping_packages do |t|
      t.references :organization, null: false, foreign_key: true
      t.string :name, null: false
      t.integer :length_mm, null: false
      t.integer :width_mm, null: false
      t.integer :height_mm, null: false
      t.integer :empty_weight_grams, null: false, default: 0
      t.integer :max_weight_grams, null: false
      t.integer :sort_order, null: false, default: 0
      t.boolean :active, null: false, default: true
      t.timestamps

      t.index %i[organization_id name], unique: true
      t.index %i[organization_id active sort_order]
      t.check_constraint "length_mm > 0", name: "shipping_packages_length_positive"
      t.check_constraint "width_mm > 0", name: "shipping_packages_width_positive"
      t.check_constraint "height_mm > 0", name: "shipping_packages_height_positive"
      t.check_constraint "empty_weight_grams >= 0", name: "shipping_packages_empty_weight_nonnegative"
      t.check_constraint "max_weight_grams > 0", name: "shipping_packages_max_weight_positive"
    end

    create_table :shipping_quotes do |t|
      t.references :organization, null: false, foreign_key: true
      t.references :inventory_location, null: false, foreign_key: true
      t.references :shipping_package, null: false, foreign_key: true
      t.string :cart_digest, null: false
      t.string :destination_digest, null: false
      t.string :provider, null: false, default: "easypost"
      t.string :provider_shipment_id, null: false
      t.string :provider_rate_id, null: false
      t.string :carrier, null: false
      t.string :service, null: false
      t.integer :amount_cents, null: false
      t.string :currency, null: false, limit: 3
      t.integer :delivery_days
      t.datetime :delivery_date
      t.datetime :expires_at, null: false
      t.timestamps

      t.index :provider_rate_id, unique: true
      t.index :expires_at
      t.check_constraint "amount_cents >= 0", name: "shipping_quotes_amount_nonnegative"
    end
  end
end
