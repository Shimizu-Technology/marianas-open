class CreateOrderNotifications < ActiveRecord::Migration[8.1]
  def change
    create_table :order_notifications do |t|
      t.references :order, null: false, foreign_key: true
      t.string :kind, null: false
      t.string :recipient, null: false
      t.string :status, null: false, default: "pending"
      t.string :delivery_mode
      t.string :delivered_to
      t.string :provider, null: false, default: "resend"
      t.string :provider_message_id
      t.string :idempotency_key, null: false
      t.string :subject, null: false
      t.text :html_body, null: false
      t.text :text_body, null: false
      t.integer :attempts, null: false, default: 0
      t.text :last_error
      t.datetime :sent_at
      t.timestamps

      t.index [ :order_id, :kind, :recipient ], unique: true
      t.index :idempotency_key, unique: true
      t.index [ :status, :created_at ]
      t.check_constraint "attempts >= 0", name: "order_notifications_attempts_nonnegative"
      t.check_constraint "status IN ('pending', 'delivering', 'sent', 'suppressed', 'failed')",
        name: "order_notifications_status_valid"
    end
  end
end
