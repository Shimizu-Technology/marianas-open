class AddProcessingLeaseToEventGalleryImages < ActiveRecord::Migration[8.1]
  def change
    add_column :event_gallery_images, :processing_token, :string
    add_column :event_gallery_images, :processing_started_at, :datetime
    reversible do |dir|
      dir.up do
        execute <<~SQL.squish
          UPDATE event_gallery_images
          SET processing_started_at = updated_at
          WHERE status = 'processing'
            AND processing_started_at IS NULL
        SQL
      end
    end
    add_index :event_gallery_images, :processing_token
    add_index :event_gallery_images, [:status, :processing_started_at]
  end
end
