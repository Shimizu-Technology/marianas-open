class RenameSiteImageGalleryToFeatured < ActiveRecord::Migration[8.1]
  def up
    execute "UPDATE site_images SET placement = 'featured' WHERE placement = 'gallery'"
    execute "UPDATE site_images SET placement = 'featured' WHERE placement = 'sponsor_default'"
  end

  def down
    execute "UPDATE site_images SET placement = 'gallery' WHERE placement = 'featured'"
  end
end
