class SecureAsjjfLeases < ActiveRecord::Migration[8.0]
  def change
    add_column :asjjf_fetch_requests, :lease_token, :string
    create_table :asjjf_fetcher_rate_limits do |t|
      t.string :credential_digest, null: false
      t.datetime :window_started_at
      t.integer :request_count, null: false, default: 0
      t.timestamps
    end
    add_index :asjjf_fetcher_rate_limits, :credential_digest, unique: true
  end
end
