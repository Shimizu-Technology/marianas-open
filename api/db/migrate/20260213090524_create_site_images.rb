class CreateSiteImages < ActiveRecord::Migration[8.0]
  def change
    create_table :site_images do |t|
      t.string :title
      t.string :alt_text
      t.string :placement, null: false
      t.integer :sort_order, default: 0
      t.boolean :active, default: true
      t.string :caption
      t.timestamps
    end
    add_index :site_images, :placement
    add_index :site_images, [:placement, :sort_order]
  end
end
