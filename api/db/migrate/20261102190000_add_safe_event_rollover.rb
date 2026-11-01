class AddSafeEventRollover < ActiveRecord::Migration[8.1]
  def up
    add_column :events, :season_year, :integer
    add_reference :events, :source_event, foreign_key: { to_table: :events, on_delete: :nullify } unless column_exists?(:events, :source_event_id)
    add_column :events, :registration_not_open, :boolean, default: false, null: false
    add_column :events, :content_review_required, :boolean, default: false, null: false
    add_column :events, :asjjf_info_id, :bigint
    add_column :events, :asjjf_info_snapshot_id, :bigint
    add_column :events, :asjjf_info_status, :string
    add_index :events, :season_year
    # Fail safely on existing duplicates rather than silently changing public URLs.
    add_index :events, :slug, unique: true, where: "slug IS NOT NULL AND slug <> ''" unless index_exists?(:events, :slug, unique: true)
    add_column :event_schedule_items, :confirmed, :boolean, default: true, null: false
    add_column :prize_categories, :confirmed, :boolean, default: true, null: false
    create_table :event_audit_entries do |t|
      t.references :event, null: false, foreign_key: true
      t.references :actor, foreign_key: { to_table: :users, on_delete: :nullify }
      t.string :actor_name, null: false
      t.string :action, null: false
      t.string :from_status
      t.string :to_status
      t.text :reason
      t.jsonb :metadata, default: {}, null: false
      t.timestamps
    end
  end
  def down
    raise ActiveRecord::IrreversibleMigration, "Publishing audits and source lineage must be preserved"
  end
end
