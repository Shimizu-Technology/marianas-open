class AddCategoryToEventGalleryImages < ActiveRecord::Migration[8.1]
  def change
    add_column :event_gallery_images, :category, :string
    add_index :event_gallery_images, [:event_id, :category, :sort_order], name: "index_event_gallery_images_on_event_category_sort"
  end
end
