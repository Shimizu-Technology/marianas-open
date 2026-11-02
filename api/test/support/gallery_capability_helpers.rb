module GalleryCapabilityHelpers
  def with_heif_capability(supported)
    original = GalleryImageCapabilities.method(:heif_supported?)
    GalleryImageCapabilities.define_singleton_method(:heif_supported?) { supported }
    yield
  ensure
    GalleryImageCapabilities.define_singleton_method(:heif_supported?, original) if original
  end
end
