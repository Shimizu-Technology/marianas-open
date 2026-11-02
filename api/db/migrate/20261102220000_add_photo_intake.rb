class AddPhotoIntake < ActiveRecord::Migration[8.1]
  def change
    add_column :events, :gallery_timezone, :string, null: false, default: "Pacific/Guam"
    add_column :events, :gallery_hold_flagged, :boolean, null: false, default: false

    create_table :event_gallery_albums do |t|
      t.references :event, null: false, foreign_key: true
      t.string :name, null: false, limit: 80
      t.integer :sort_order, null: false, default: 0
      t.timestamps
    end
    add_index :event_gallery_albums, [ :event_id, :name ], unique: true

    create_table :event_gallery_imports do |t|
      t.references :event, null: false, foreign_key: true
      t.bigint :source_blob_id, null: false
      t.bigint :prepared_by_id, null: false
      t.string :filename, null: false
      t.string :status, null: false, default: "queued"
      t.string :album_type, null: false
      t.string :category
      t.string :timezone, null: false
      t.boolean :hold_flagged, null: false, default: false
      t.integer :total_entries, null: false, default: 0
      t.integer :processed_entries, null: false, default: 0
      t.integer :imported_count, null: false, default: 0
      t.integer :skipped_count, null: false, default: 0
      t.jsonb :entry_errors, null: false, default: []
      t.datetime :completed_at
      t.timestamps
    end
    add_index :event_gallery_imports, [ :event_id, :source_blob_id ], unique: true

    add_reference :event_gallery_images, :event_gallery_import, foreign_key: true
    add_column :event_gallery_images, :album_type, :string
    add_column :event_gallery_images, :capture_timezone, :string
    add_column :event_gallery_images, :captured_at, :datetime
    add_column :event_gallery_images, :capture_source, :string
    add_column :event_gallery_images, :content_sha256, :string
    add_column :event_gallery_images, :perceptual_hash, :string
    add_column :event_gallery_images, :review_flags, :jsonb, null: false, default: []
    add_column :event_gallery_images, :review_held, :boolean, null: false, default: false
    add_column :event_gallery_images, :proposal_base_category, :string
    add_column :event_gallery_images, :reviewed_at, :datetime
    add_column :event_gallery_images, :review_analyzed_at, :datetime
    add_index :event_gallery_images, [ :event_id, :content_sha256 ],
      where: "content_sha256 IS NOT NULL", name: "gallery_images_event_content_hash"

    create_table :event_gallery_import_entries do |t|
      t.references :event_gallery_import, null: false, foreign_key: true, index: false
      t.integer :entry_index, null: false
      t.string :outcome, null: false
      t.references :event_gallery_image, foreign_key: { on_delete: :nullify }
      t.timestamps
    end
    add_index :event_gallery_import_entries, [ :event_gallery_import_id, :entry_index ], unique: true,
      name: "gallery_import_entries_position"

    # Data-only backfill avoids callbacks and leaves existing category strings intact.
    reversible do |direction|
      direction.up do
        execute <<~SQL
          INSERT INTO event_gallery_albums (event_id, name, sort_order, created_at, updated_at)
          SELECT event_id, category,
            (ROW_NUMBER() OVER (PARTITION BY event_id ORDER BY MIN(sort_order), MIN(id)) - 1),
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          FROM event_gallery_images
          WHERE category IS NOT NULL AND category <> ''
          GROUP BY event_id, category
        SQL
      end
    end
  end
end
