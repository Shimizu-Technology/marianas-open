class CreateCompetitorAliases < ActiveRecord::Migration[8.1]
  def change
    create_table :competitor_aliases do |t|
      t.references :competitor, null: false, foreign_key: true
      t.string :raw_name, null: false
      t.string :normalized_key, null: false
      t.string :source, null: false
      t.references :created_by, foreign_key: { to_table: :users }
      t.timestamps
    end
    add_index :competitor_aliases, :normalized_key, unique: true
  end
end
