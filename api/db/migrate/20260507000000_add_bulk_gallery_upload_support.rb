class AddBulkGalleryUploadSupport < ActiveRecord::Migration[8.1]
  def change
    create_table :event_gallery_upload_batches do |t|
      t.references :event, null: false, foreign_key: true
      t.string :status, null: false, default: "uploading"
      t.string :title
      t.integer :total_files, null: false, default: 0
      t.integer :uploaded_files, null: false, default: 0
      t.integer :failed_files, null: false, default: 0
      t.bigint :total_bytes, null: false, default: 0
      t.datetime :completed_at
      t.text :notes
      t.timestamps
    end

    add_index :event_gallery_upload_batches, [:event_id, :created_at]
    add_index :event_gallery_upload_batches, :status

    change_table :event_gallery_images do |t|
      t.references :event_gallery_upload_batch, foreign_key: true, index: { name: "index_event_gallery_images_on_upload_batch_id" }
      t.string :status, null: false, default: "ready"
      t.string :original_filename
      t.string :content_type
      t.bigint :byte_size
      t.integer :width
      t.integer :height
      t.datetime :processed_at
      t.text :processing_error
    end

    add_index :event_gallery_images, [:event_id, :status]
  end
end
