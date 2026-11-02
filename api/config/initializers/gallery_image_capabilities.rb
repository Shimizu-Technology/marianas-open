Rails.application.config.after_initialize do
  GalleryImageCapabilities.heif_supported?
end
