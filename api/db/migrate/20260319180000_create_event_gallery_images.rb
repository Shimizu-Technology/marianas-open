class CreateEventGalleryImages < ActiveRecord::Migration[8.1]
  def change
    create_table :event_gallery_images, if_not_exists: true do |t|
      t.references :event, null: false, foreign_key: true
      t.string :title
      t.string :alt_text
      t.string :caption
      t.integer :sort_order, null: false, default: 0
      t.boolean :active, null: false, default: true
      t.timestamps
    end

    add_index :event_gallery_images, [:event_id, :active], if_not_exists: true
    add_index :event_gallery_images, [:event_id, :sort_order], if_not_exists: true
  end
end
