class CreateOrganizations < ActiveRecord::Migration[8.1]
  def change
    create_table :organizations do |t|
      t.string :name
      t.string :slug
      t.text :description
      t.string :primary_color
      t.string :secondary_color
      t.string :contact_email
      t.string :phone
      t.string :website_url
      t.string :instagram_url
      t.string :facebook_url
      t.integer :founded_year

      t.timestamps
    end
  end
end
