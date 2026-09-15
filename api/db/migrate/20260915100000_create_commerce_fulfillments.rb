class CreateCommerceFulfillments < ActiveRecord::Migration[8.1]
  def change
    create_table :fulfillments do |t|
      t.references :order, null: false, foreign_key: true, index: { unique: true }
      t.references :updated_by, foreign_key: { to_table: :users }, null: true
      t.string :status, null: false, default: "unfulfilled"
      t.text :staff_note
      t.datetime :preparing_at
      t.datetime :ready_for_pickup_at
      t.datetime :picked_up_at
      t.datetime :shipped_at
      t.datetime :delivered_at
      t.timestamps

      t.index [ :status, :updated_at ]
      t.check_constraint "status IN ('unfulfilled', 'preparing', 'ready_for_pickup', 'picked_up', 'shipped', 'delivered')",
        name: "fulfillments_status_valid"
    end

    create_table :shipments do |t|
      t.references :order, null: false, foreign_key: true, index: { unique: true }
      t.references :shipping_quote, null: false, foreign_key: true
      t.string :provider, null: false, default: "easypost"
      t.string :provider_mode, null: false
      t.string :provider_shipment_id, null: false
      t.string :provider_rate_id, null: false
      t.string :provider_tracker_id
      t.string :status, null: false, default: "purchasing"
      t.string :carrier, null: false
      t.string :service, null: false
      t.string :tracking_code
      t.string :tracking_url
      t.string :label_url
      t.string :label_format
      t.integer :postage_cents
      t.string :currency, limit: 3, null: false, default: "USD"
      t.datetime :purchased_at
      t.datetime :last_tracking_update_at
      t.text :last_error
      t.timestamps

      t.index [ :provider, :provider_shipment_id ], unique: true
      t.index :provider_tracker_id, unique: true, where: "provider_tracker_id IS NOT NULL"
      t.index [ :status, :updated_at ]
      t.check_constraint "status IN ('purchasing', 'purchased', 'unknown', 'pre_transit', 'in_transit', 'out_for_delivery', 'delivered', 'available_for_pickup', 'return_to_sender', 'failure', 'cancelled', 'error')",
        name: "shipments_status_valid"
      t.check_constraint "postage_cents IS NULL OR postage_cents >= 0", name: "shipments_postage_nonnegative"
    end

    create_table :shipment_events do |t|
      t.references :shipment, null: true, foreign_key: true
      t.string :provider, null: false, default: "easypost"
      t.string :provider_event_id, null: false
      t.string :event_type, null: false
      t.string :status, null: false, default: "received"
      t.string :provider_object_id
      t.text :last_error
      t.datetime :processed_at
      t.timestamps

      t.index [ :provider, :provider_event_id ], unique: true
      t.index [ :status, :created_at ]
      t.check_constraint "status IN ('received', 'processing', 'processed', 'ignored', 'failed')",
        name: "shipment_events_status_valid"
    end
  end
end
