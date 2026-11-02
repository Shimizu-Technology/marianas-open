require "vips"

class GalleryImageCapabilities
  # libvips decodes both HEIF/HEIC and AVIF with heifload. Probe once per process;
  # API and worker must use the same native libraries and deploy revision.
  HEIF_SUPPORTED = Vips.type_find("VipsOperation", "heifload").nonzero? ? true : false

  def self.heif_supported?
    HEIF_SUPPORTED
  end
end
