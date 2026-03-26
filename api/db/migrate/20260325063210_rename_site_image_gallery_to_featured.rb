class RenameSiteImageGalleryToFeatured < ActiveRecord::Migration[8.1]
  def up
    execute "UPDATE site_images SET placement = 'featured' WHERE placement = 'gallery'"
    execute "UPDATE site_images SET placement = 'featured' WHERE placement = 'sponsor_default'"
  end

  # NOTE: Lossy rollback — both gallery and sponsor_default records become
  # 'featured' in up, so down cannot distinguish which were originally
  # sponsor_default. This is acceptable because sponsor_default is no longer
  # a valid placement in the application. Do not roll back after production deploy.
  def down
    execute "UPDATE site_images SET placement = 'gallery' WHERE placement = 'featured'"
  end
end
