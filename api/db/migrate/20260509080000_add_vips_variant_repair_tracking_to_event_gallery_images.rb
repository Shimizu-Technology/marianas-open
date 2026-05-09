class AddVipsVariantRepairTrackingToEventGalleryImages < ActiveRecord::Migration[8.1]
  def change
    add_column :event_gallery_images, :vips_variants_repaired_at, :datetime
    add_column :event_gallery_images, :vips_variant_repair_attempts, :integer, null: false, default: 0

    add_index :event_gallery_images,
      [ :status, :vips_variants_repaired_at, :vips_variant_repair_attempts ],
      name: "index_event_gallery_images_on_vips_variant_repair"
  end
end
