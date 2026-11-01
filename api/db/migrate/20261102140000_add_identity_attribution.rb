class AddIdentityAttribution < ActiveRecord::Migration[8.1]
  def change
    # Existing duplicates are intentionally untouched. A unique index is deferred
    # until the reviewed manual repair and collision audit have completed.
    add_column :academies, :normalized_name, :string
    add_index :academies, :normalized_name
    add_reference :academies, :parent, foreign_key: { to_table: :academies }
    add_column :academies, :unaffiliated, :boolean, default: false, null: false

    add_column :competitors, :normalized_name, :string
    add_column :competitors, :reverse_normalized_name, :string
    add_column :competitors, :identity_separate, :boolean, default: false, null: false
    add_index :competitors, :normalized_name
    add_index :competitors, :reverse_normalized_name

    add_reference :event_results, :academy, foreign_key: true
    add_column :event_results, :raw_competitor_name, :string

    create_table :identity_reviews do |t|
      t.string :raw_name, null: false
      t.string :normalized_name, null: false
      t.references :candidate_academy, foreign_key: { to_table: :academies }
      t.references :resolved_academy, foreign_key: { to_table: :academies }
      t.string :status, default: "pending", null: false
      t.timestamps
    end
    add_index :identity_reviews, :normalized_name, unique: true
  end
end
