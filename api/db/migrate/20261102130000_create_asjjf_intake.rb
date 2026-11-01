class CreateAsjjfIntake < ActiveRecord::Migration[8.0]
  def change
    create_table :asjjf_snapshots do |t|
      t.text :url, null: false
      t.text :final_url
      t.string :page_type, null: false
      t.bigint :asjjf_id
      t.jsonb :params, null: false, default: {}
      t.integer :http_status
      t.string :outcome, null: false
      t.datetime :fetched_at, null: false
      t.string :fetcher_id
      t.string :sha256, null: false
      t.integer :byte_size, null: false
      t.binary :compressed_html, null: false
      t.string :parse_status, null: false, default: "pending"
      t.text :parse_error
      t.datetime :parsed_at
      t.jsonb :parsed_summary, null: false, default: {}
      t.string :source, null: false
      t.references :uploaded_by_user, foreign_key: { to_table: :users, on_delete: :nullify }
      t.timestamps
    end
    add_index :asjjf_snapshots, [ :url, :fetched_at ]
    add_index :asjjf_snapshots, [ :parse_status, :created_at ]

    create_table :asjjf_fetch_requests do |t|
      t.text :url, null: false
      t.string :page_type, null: false
      t.string :status, null: false, default: "pending"
      t.boolean :include_divisions, null: false, default: false
      t.integer :priority, null: false, default: 0
      t.text :reason
      t.string :requested_by
      t.integer :attempts, null: false, default: 0
      t.string :leased_by
      t.datetime :lease_expires_at
      t.datetime :completed_at
      t.text :last_error
      t.references :snapshot, foreign_key: { to_table: :asjjf_snapshots }
      t.timestamps
    end
    add_index :asjjf_fetch_requests, [ :status, :priority, :created_at ], name: "index_asjjf_requests_for_leasing"
    add_index :asjjf_fetch_requests, :lease_expires_at
    add_index :asjjf_fetch_requests, :url, unique: true, where: "status IN ('pending', 'leased')", name: "index_asjjf_requests_active_url"

    create_table :asjjf_fetcher_heartbeats do |t|
      t.string :fetcher_id, null: false
      t.string :fetcher_version
      t.datetime :run_started_at
      t.datetime :run_finished_at
      t.integer :fetched, null: false, default: 0
      t.integer :challenged, null: false, default: 0
      t.integer :error_count, null: false, default: 0
      t.datetime :received_at
      t.datetime :rate_window_started_at
      t.integer :rate_count, null: false, default: 0
      t.timestamps
    end
    add_index :asjjf_fetcher_heartbeats, :fetcher_id, unique: true

    create_table :asjjf_settings do |t|
      t.string :key, null: false
      t.datetime :paused_until
      t.datetime :alerted_at
      t.text :reason
      t.timestamps
    end
    add_index :asjjf_settings, :key, unique: true

    create_table :event_asjjf_sources do |t|
      t.references :event, null: false, foreign_key: true
      t.bigint :asjjf_event_id, null: false
      t.string :discipline, null: false, default: "unknown"
      t.string :derived_from, null: false
      t.timestamps
    end
    add_index :event_asjjf_sources, [ :event_id, :asjjf_event_id ], unique: true
  end
end
