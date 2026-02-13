class CreateSponsors < ActiveRecord::Migration[8.1]
  def change
    create_table :sponsors do |t|
      t.references :organization, null: false, foreign_key: true
      t.string :name
      t.string :tier
      t.string :website_url
      t.integer :sort_order

      t.timestamps
    end
  end
end
