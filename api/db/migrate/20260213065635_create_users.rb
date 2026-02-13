class CreateUsers < ActiveRecord::Migration[8.1]
  def change
    create_table :users do |t|
      t.string :clerk_id, null: false
      t.string :email, null: false
      t.string :first_name
      t.string :last_name
      t.string :role, default: 'viewer', null: false

      t.timestamps
    end

    add_index :users, :clerk_id, unique: true
    add_index :users, :email, unique: true
  end
end
