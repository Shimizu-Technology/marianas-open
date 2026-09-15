class CreateCommerceRefunds < ActiveRecord::Migration[8.1]
  def change
    create_table :order_refunds do |t|
      t.references :order, null: false, foreign_key: true
      t.references :requested_by, null: true, foreign_key: { to_table: :users }
      t.string :provider, null: false, default: "stripe"
      t.string :provider_mode, null: false
      t.string :provider_refund_id
      t.string :request_key, null: false
      t.string :source, null: false, default: "admin"
      t.string :status, null: false, default: "pending_provider"
      t.string :reason, null: false
      t.text :staff_note
      t.integer :amount_cents, null: false
      t.string :currency, null: false, limit: 3
      t.string :provider_balance_transaction_id
      t.string :failure_reason
      t.datetime :requested_at, null: false
      t.datetime :processed_at
      t.timestamps

      t.index :request_key, unique: true
      t.index [ :provider, :provider_refund_id ], unique: true, where: "provider_refund_id IS NOT NULL"
      t.index [ :order_id, :status ]
      t.check_constraint "amount_cents > 0", name: "order_refunds_amount_positive"
      t.check_constraint "status IN ('pending_provider', 'pending', 'requires_action', 'succeeded', 'failed', 'canceled', 'error')",
        name: "order_refunds_status_valid"
      t.check_constraint "source IN ('admin', 'stripe_dashboard')", name: "order_refunds_source_valid"
    end

    add_column :orders, :last_reconciled_at, :datetime
    add_index :orders, :last_reconciled_at

    add_column :order_notifications, :reference_key, :string, null: false, default: "order"
    remove_index :order_notifications, column: [ :order_id, :kind, :recipient ]
    add_index :order_notifications, [ :order_id, :kind, :recipient, :reference_key ], unique: true,
      name: "index_order_notifications_on_delivery_identity"
  end
end
