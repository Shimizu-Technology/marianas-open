class CreateAcademies < ActiveRecord::Migration[8.1]
  def change
    create_table :academies do |t|
      t.string :name, null: false
      t.string :slug, null: false
      t.string :country_code, limit: 2
      t.string :location
      t.string :website_url
      t.string :instagram_url
      t.string :facebook_url
      t.text :description

      t.timestamps
    end
    add_index :academies, :slug, unique: true
    add_index :academies, :country_code

    add_reference :competitors, :academy, foreign_key: true, null: true
  end
end
