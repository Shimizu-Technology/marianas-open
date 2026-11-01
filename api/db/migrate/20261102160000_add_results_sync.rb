class AddResultsSync < ActiveRecord::Migration[8.0]
  def up
    add_column :event_results, :source, :string, null: false, default: "manual"
    add_column :event_results, :asjjf_event_id, :bigint
    add_column :event_results, :discipline, :string
    add_column :event_results, :division_key, :string
    add_column :event_results, :alone_in_bracket, :boolean
    add_column :event_results, :manually_edited_at, :datetime
    add_column :event_results, :sync_key, :jsonb
    # Historical imports have no reliable per-row source id. Leave it null until
    # a unique snapshot match establishes provenance. Never guess a source id.
    execute <<~SQL
      UPDATE event_results SET source = 'asjjf', discipline = CASE
        WHEN division ~ '^\\[NOGI\\] ' THEN 'nogi'
        WHEN division ~ '^\\[GI\\] ' THEN 'gi'
        ELSE NULL END
    SQL
    add_index :event_results, [ :event_id, :source, :asjjf_event_id ], name: "index_event_results_on_sync_source"
    add_check_constraint :event_results, "source IN ('manual', 'asjjf')", name: "event_results_source"
    add_check_constraint :event_results, "discipline IS NULL OR discipline IN ('gi', 'nogi')", name: "event_results_discipline"

    add_column :events, :results_sync_status, :string
    add_column :events, :results_last_checked_at, :datetime
    add_column :events, :results_fetch_planned_at, :datetime

    create_table :results_sync_runs do |t|
      t.references :event, null: false, foreign_key: true
      t.string :trigger, null: false
      t.string :status, null: false
      t.jsonb :diff_summary, null: false, default: {}
      t.jsonb :guard_failures, null: false, default: []
      t.datetime :applied_at
      t.references :approved_by, foreign_key: { to_table: :users, on_delete: :nullify }
      t.datetime :discarded_at
      t.text :error
      t.timestamps
    end
    add_index :results_sync_runs, [ :event_id, :created_at ]
    add_reference :events, :results_sync_run, foreign_key: { to_table: :results_sync_runs, on_delete: :nullify }
  end

  def down
    remove_reference :events, :results_sync_run, foreign_key: true
    drop_table :results_sync_runs
    remove_column :events, :results_sync_status
    remove_column :events, :results_last_checked_at
    remove_column :events, :results_fetch_planned_at
    remove_check_constraint :event_results, name: "event_results_source"
    remove_check_constraint :event_results, name: "event_results_discipline"
    remove_index :event_results, name: "index_event_results_on_sync_source"
    %i[source asjjf_event_id discipline division_key alone_in_bracket manually_edited_at sync_key].each do |column|
      remove_column :event_results, column
    end
  end
end
