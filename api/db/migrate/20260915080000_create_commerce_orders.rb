class CreateCommerceOrders < ActiveRecord::Migration[8.1]
  def change
    create_table :orders do |t|
      t.references :organization, null: false, foreign_key: true
      t.references :inventory_location, null: false, foreign_key: true
      t.references :shipping_quote, foreign_key: true
      t.string :number, null: false
      t.string :checkout_key, null: false
      t.string :status, null: false, default: "pending_payment"
      t.string :fulfillment_method, null: false
      t.string :customer_name, null: false
      t.string :customer_email, null: false
      t.string :customer_phone
      t.jsonb :shipping_address, null: false, default: {}
      t.string :currency, null: false, limit: 3
      t.integer :subtotal_cents, null: false
      t.integer :shipping_cents, null: false, default: 0
      t.integer :tax_cents, null: false, default: 0
      t.integer :total_cents, null: false
      t.string :shipping_carrier
      t.string :shipping_service
      t.string :stripe_checkout_session_id
      t.text :stripe_checkout_url
      t.string :stripe_payment_intent_id
      t.datetime :payment_expires_at, null: false
      t.datetime :paid_at
      t.datetime :cancelled_at
      t.text :payment_error
      t.timestamps

      t.index [ :organization_id, :number ], unique: true
      t.index :checkout_key, unique: true
      t.index :stripe_checkout_session_id, unique: true, where: "stripe_checkout_session_id IS NOT NULL"
      t.index [ :organization_id, :status, :created_at ]
      t.check_constraint "subtotal_cents >= 0", name: "orders_subtotal_nonnegative"
      t.check_constraint "shipping_cents >= 0", name: "orders_shipping_nonnegative"
      t.check_constraint "tax_cents >= 0", name: "orders_tax_nonnegative"
      t.check_constraint "total_cents = subtotal_cents + shipping_cents + tax_cents", name: "orders_total_matches_parts"
    end

    create_table :order_items do |t|
      t.references :order, null: false, foreign_key: true
      t.references :product, null: false, foreign_key: true
      t.references :product_variant, null: false, foreign_key: true
      t.string :product_name, null: false
      t.string :variant_name, null: false
      t.string :sku, null: false
      t.jsonb :options_snapshot, null: false, default: []
      t.integer :unit_price_cents, null: false
      t.integer :quantity, null: false
      t.integer :line_total_cents, null: false
      t.string :currency, null: false, limit: 3
      t.timestamps

      t.index [ :order_id, :product_variant_id ], unique: true
      t.check_constraint "unit_price_cents >= 0", name: "order_items_unit_price_nonnegative"
      t.check_constraint "quantity > 0", name: "order_items_quantity_positive"
      t.check_constraint "line_total_cents = unit_price_cents * quantity", name: "order_items_total_matches_price"
    end

    create_table :inventory_reservations do |t|
      t.references :order, null: false, foreign_key: true
      t.references :product_variant, null: false, foreign_key: true
      t.references :inventory_location, null: false, foreign_key: true
      t.integer :quantity, null: false
      t.string :status, null: false, default: "active"
      t.datetime :expires_at, null: false
      t.datetime :released_at
      t.datetime :consumed_at
      t.timestamps

      t.index [ :order_id, :product_variant_id ], unique: true
      t.index [ :status, :expires_at ]
      t.check_constraint "quantity > 0", name: "inventory_reservations_quantity_positive"
    end

    create_table :payment_events do |t|
      t.references :order, foreign_key: true
      t.string :provider, null: false, default: "stripe"
      t.string :provider_event_id, null: false
      t.string :event_type, null: false
      t.string :status, null: false, default: "received"
      t.datetime :processed_at
      t.text :processing_error
      t.timestamps

      t.index [ :provider, :provider_event_id ], unique: true
      t.index [ :status, :created_at ]
    end
  end
end
