class CreateCompetitors < ActiveRecord::Migration[8.0]
  def change
    create_table :competitors do |t|
      t.string :first_name, null: false
      t.string :last_name, null: false
      t.string :nickname
      t.string :country_code, limit: 2
      t.string :belt_rank
      t.string :weight_class
      t.string :academy
      t.text :bio
      t.string :instagram_url
      t.string :youtube_url
      t.integer :wins, default: 0, null: false
      t.integer :losses, default: 0, null: false
      t.integer :draws, default: 0, null: false
      t.integer :gold_medals, default: 0, null: false
      t.integer :silver_medals, default: 0, null: false
      t.integer :bronze_medals, default: 0, null: false

      t.timestamps
    end

    add_index :competitors, :belt_rank
    add_index :competitors, :weight_class
    add_index :competitors, :country_code
  end
end
