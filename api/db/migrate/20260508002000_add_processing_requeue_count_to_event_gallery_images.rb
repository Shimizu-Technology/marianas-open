class AddProcessingRequeueCountToEventGalleryImages < ActiveRecord::Migration[8.1]
  def change
    add_column :event_gallery_images, :processing_requeue_count, :integer, null: false, default: 0
  end
end
