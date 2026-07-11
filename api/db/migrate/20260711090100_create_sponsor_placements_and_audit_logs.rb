class CreateSponsorPlacementsAndAuditLogs < ActiveRecord::Migration[8.1]
  def change
    create_table :sponsor_placements do |t|
      t.references :sponsor, null: false, foreign_key: true
      t.references :season, foreign_key: true
      t.references :event, foreign_key: true
      t.string :placement_type, null: false, default: "featured_bar"
      t.string :media_kind, null: false, default: "logo"
      t.string :headline
      t.text :body
      t.string :cta_label
      t.string :cta_url
      t.datetime :starts_at
      t.datetime :ends_at
      t.boolean :active, null: false, default: true
      t.integer :sort_order, null: false, default: 0
      t.bigint :impressions_count, null: false, default: 0
      t.bigint :clicks_count, null: false, default: 0
      t.timestamps
    end

    add_index :sponsor_placements, [:placement_type, :active, :sort_order],
              name: "index_sponsor_placements_for_public_display"

    create_table :audit_logs do |t|
      t.references :actor, foreign_key: { to_table: :users }
      t.string :action, null: false
      t.string :auditable_type, null: false
      t.bigint :auditable_id
      t.string :auditable_label
      t.jsonb :changes, null: false, default: {}
      t.jsonb :metadata, null: false, default: {}
      t.timestamps
    end

    add_index :audit_logs, [:auditable_type, :auditable_id, :created_at], name: "index_audit_logs_on_auditable"
    add_index :audit_logs, :created_at
  end
end
