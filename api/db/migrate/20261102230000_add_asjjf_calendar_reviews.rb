class AddAsjjfCalendarReviews < ActiveRecord::Migration[8.1]
  def change
    add_reference :events, :asjjf_calendar_snapshot, foreign_key: { to_table: :asjjf_snapshots }
    add_column :events, :registration_opens_on, :date

    create_table :asjjf_calendar_runs do |t|
      t.references :snapshot, null: false, foreign_key: { to_table: :asjjf_snapshots }, index: { unique: true }
      t.integer :season_id, null: false
      t.integer :season_year
      t.jsonb :summary, null: false, default: {}
      t.timestamps
    end

    create_table :asjjf_calendar_reviews do |t|
      t.references :snapshot, null: false, foreign_key: { to_table: :asjjf_snapshots }
      t.references :event, foreign_key: true
      t.string :kind, null: false
      t.string :status, null: false, default: "pending"
      t.string :title, null: false
      t.string :fingerprint, null: false
      t.jsonb :old_values, null: false, default: {}
      t.jsonb :new_values, null: false, default: {}
      t.datetime :reviewed_at
      t.timestamps
      t.index :fingerprint, unique: true
      t.index [ :status, :id ]
    end
  end
end
