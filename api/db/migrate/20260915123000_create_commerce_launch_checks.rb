class CreateCommerceLaunchChecks < ActiveRecord::Migration[8.1]
  def change
    create_table :commerce_launch_checks do |t|
      t.references :organization, null: false, foreign_key: true
      t.references :reviewed_by, foreign_key: { to_table: :users }
      t.string :key, null: false
      t.string :status, null: false, default: "pending"
      t.text :note, null: false, default: ""
      t.datetime :reviewed_at
      t.timestamps
    end

    add_index :commerce_launch_checks, [ :organization_id, :key ], unique: true
    add_check_constraint :commerce_launch_checks,
      "status IN ('pending', 'passed', 'blocked')",
      name: "commerce_launch_checks_status_valid"
  end
end
