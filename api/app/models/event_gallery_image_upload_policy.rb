class EventGalleryImageUploadPolicy
  SOURCE_CONTENT_TYPES = %w[
    image/jpeg
    image/png
    image/webp
    image/gif
    image/heic
    image/heif
    image/avif
    image/tiff
  ].freeze

  BROWSER_PREVIEWABLE_CONTENT_TYPES = %w[
    image/jpeg
    image/png
    image/webp
    image/gif
    image/avif
  ].freeze

  EXTENSION_CONTENT_TYPES = {
    ".jpg" => "image/jpeg",
    ".jpeg" => "image/jpeg",
    ".png" => "image/png",
    ".webp" => "image/webp",
    ".gif" => "image/gif",
    ".heic" => "image/heic",
    ".heif" => "image/heif",
    ".avif" => "image/avif",
    ".tif" => "image/tiff",
    ".tiff" => "image/tiff"
  }.freeze

  OPTIONAL_CONTENT_TYPES = %w[image/heic image/heif image/avif].freeze

  class << self
    def accepted_content_types
      GalleryImageCapabilities.heif_supported? ? SOURCE_CONTENT_TYPES : SOURCE_CONTENT_TYPES - OPTIONAL_CONTENT_TYPES
    end

    def accepted_extensions
      EXTENSION_CONTENT_TYPES.select { |_, type| accepted_content_types.include?(type) }.keys
    end

    def browser_previewable?(content_type)
      BROWSER_PREVIEWABLE_CONTENT_TYPES.include?(normalize_content_type(content_type))
    end

    def accepted?(filename:, content_type:)
      accepted_content_types.include?(normalize(filename: filename, content_type: content_type))
    end

    def normalize(filename:, content_type:)
      normalized_content_type = normalize_content_type(content_type)
      extension_type = EXTENSION_CONTENT_TYPES[File.extname(filename.to_s).downcase]
      return normalized_content_type if OPTIONAL_CONTENT_TYPES.include?(normalized_content_type)
      return extension_type if OPTIONAL_CONTENT_TYPES.include?(extension_type)
      return normalized_content_type if SOURCE_CONTENT_TYPES.include?(normalized_content_type)

      extension_type || normalized_content_type
    end

    def normalize_blob!(blob)
      normalized_content_type = normalize(filename: blob.filename.to_s, content_type: blob.content_type)
      return normalized_content_type if normalized_content_type == blob.content_type

      blob.update!(content_type: normalized_content_type)
      normalized_content_type
    end

    def source_type_label
      accepted_content_types.map { |type| { "image/jpeg" => "JPEG", "image/webp" => "WebP" }.fetch(type, type.delete_prefix("image/").upcase) }.join(", ")
    end

    def configuration
      { content_types: accepted_content_types, extensions: accepted_extensions, type_label: source_type_label }
    end

    def unsupported_format_error(content_type)
      return unless OPTIONAL_CONTENT_TYPES.include?(content_type) && !accepted_content_types.include?(content_type)
      format = content_type.delete_prefix("image/").upcase
      "This photo is #{format}. iPhone photos upload automatically as JPEG when chosen from the photo picker; for ZIPs, export as JPEG."
    end

    def validation_error(content_type = nil)
      unsupported_format_error(content_type) || "must be a #{source_type_label} file"
    end

    def choose_error(content_type = nil)
      unsupported_format_error(content_type) || "Choose #{source_type_label} images"
    end

    private

    def normalize_content_type(content_type)
      content_type.to_s.split(";").first.to_s.strip.downcase
    end
  end
end
