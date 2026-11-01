class CreateAsjjfRankings < ActiveRecord::Migration[8.1]
  def change
    add_column :asjjf_snapshots, :ranking_apply_status, :string
    add_column :asjjf_snapshots, :ranking_apply_error, :text
    add_column :asjjf_snapshots, :ranking_applied_at, :datetime
    create_table :asjjf_ranking_seasons do |t|
      t.integer :season_year, null: false
      t.bigint :gi_ranking_id
      t.bigint :nogi_ranking_id
      t.bigint :team_ranking_id
      t.bigint :team_nogi_ranking_id
      t.boolean :current, null: false, default: false
      t.datetime :last_planned_at
      t.datetime :last_results_imported_at
      t.timestamps
    end
    add_index :asjjf_ranking_seasons, :season_year, unique: true
    add_index :asjjf_ranking_seasons, :current, unique: true, where: '"current" = true'

    create_table :asjjf_ranking_lists do |t|
      t.references :asjjf_ranking_season, null: false, foreign_key: true
      t.bigint :asjjf_ranking_id, null: false
      t.integer :season_year, null: false
      t.string :circuit, null: false, default: 'Marianas Pro'
      t.string :discipline, null: false
      t.string :kind, null: false
      t.string :category, null: false, default: 'adult'
      t.string :title, null: false
      t.string :status, null: false, default: 'pending'
      t.datetime :last_synced_at
      t.references :source_snapshot, foreign_key: { to_table: :asjjf_snapshots, on_delete: :nullify }
      t.timestamps
    end
    add_index :asjjf_ranking_lists, [ :asjjf_ranking_season_id, :discipline, :kind, :category ], unique: true, name: 'idx_ranking_list_identity'

    create_table :asjjf_ranking_divisions do |t|
      t.references :asjjf_ranking_list, null: false, foreign_key: true
      t.bigint :asjjf_division_id, null: false
      t.string :gender, null: false
      t.string :age_group, null: false
      t.string :belt, null: false
      t.string :label, null: false
      t.integer :position, null: false
      t.string :status, null: false, default: 'pending'
      t.datetime :last_synced_at
      t.references :source_snapshot, foreign_key: { to_table: :asjjf_snapshots, on_delete: :nullify }
      t.timestamps
    end
    add_index :asjjf_ranking_divisions, [ :asjjf_ranking_list_id, :asjjf_division_id ], unique: true, name: 'idx_ranking_division_identity'

    create_table :asjjf_ranking_entries do |t|
      t.references :asjjf_ranking_list, null: false, foreign_key: true
      t.references :asjjf_ranking_division, foreign_key: true
      t.integer :position, null: false
      t.string :name, null: false
      t.string :academy_name
      t.string :raw_country_code
      t.string :country_code
      t.decimal :points, precision: 14, scale: 3, null: false
      t.integer :gold
      t.integer :silver
      t.integer :bronze
      t.references :competitor, foreign_key: { on_delete: :nullify }
      t.references :academy, foreign_key: { on_delete: :nullify }
      t.references :source_snapshot, foreign_key: { to_table: :asjjf_snapshots, on_delete: :nullify }
      t.timestamps
    end
    add_index :asjjf_ranking_entries, [ :asjjf_ranking_division_id, :position ], name: 'idx_ranking_entry_order'

    create_table :asjjf_ranking_suggestions do |t|
      t.bigint :asjjf_ranking_id, null: false
      t.integer :season_year, null: false
      t.string :discipline, null: false
      t.string :kind, null: false
      t.string :title, null: false
      t.string :source_url, null: false
      t.references :source_snapshot, foreign_key: { to_table: :asjjf_snapshots, on_delete: :nullify }
      t.timestamps
    end
    add_index :asjjf_ranking_suggestions, [ :asjjf_ranking_id, :kind ], unique: true

    reversible do |dir|
      dir.up do
        execute <<~SQL
          INSERT INTO asjjf_ranking_seasons (season_year, gi_ranking_id, nogi_ranking_id, team_ranking_id, "current", created_at, updated_at)
          VALUES (2026, 227, 234, 227, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        SQL
        execute <<~SQL
          INSERT INTO asjjf_ranking_lists (asjjf_ranking_season_id, asjjf_ranking_id, season_year, discipline, kind, category, title, created_at, updated_at)
          SELECT id, ranking_id, season_year, discipline, kind, category, 'Marianas Pro Ranking 2026', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          FROM asjjf_ranking_seasons CROSS JOIN (VALUES (227, 'gi', 'individual', 'adult'), (234, 'nogi', 'individual', 'adult'),
          (227, 'gi', 'team', 'adult'), (227, 'gi', 'team', 'kids')) AS lists(ranking_id, discipline, kind, category)
        SQL
      end
    end
  end
end
