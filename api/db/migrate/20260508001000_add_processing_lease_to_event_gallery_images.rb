class AddProcessingLeaseToEventGalleryImages < ActiveRecord::Migration[8.1]
  def change
    add_column :event_gallery_images, :processing_token, :string
    add_column :event_gallery_images, :processing_started_at, :datetime
    add_index :event_gallery_images, :processing_token
    add_index :event_gallery_images, [:status, :processing_started_at]
  end
end
