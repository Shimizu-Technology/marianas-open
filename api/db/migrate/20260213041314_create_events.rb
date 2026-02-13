class CreateEvents < ActiveRecord::Migration[8.1]
  def change
    create_table :events do |t|
      t.references :organization, null: false, foreign_key: true
      t.string :name
      t.string :slug
      t.text :description
      t.date :date
      t.date :end_date
      t.string :venue_name
      t.string :venue_address
      t.string :city
      t.string :country
      t.string :country_code
      t.decimal :latitude
      t.decimal :longitude
      t.integer :asjjf_stars
      t.boolean :is_main_event
      t.string :registration_url
      t.decimal :prize_pool
      t.string :status

      t.timestamps
    end
  end
end
