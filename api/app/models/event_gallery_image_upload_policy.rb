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

  SOURCE_TYPE_LABEL = "JPEG, PNG, WebP, GIF, HEIC, HEIF, AVIF, or TIFF".freeze

  class << self
    def accepted_content_types
      SOURCE_CONTENT_TYPES
    end

    def accepted_extensions
      EXTENSION_CONTENT_TYPES.keys
    end

    def browser_previewable?(content_type)
      BROWSER_PREVIEWABLE_CONTENT_TYPES.include?(normalize_content_type(content_type))
    end

    def accepted?(filename:, content_type:)
      accepted_content_types.include?(normalize(filename: filename, content_type: content_type))
    end

    def normalize(filename:, content_type:)
      normalized_content_type = normalize_content_type(content_type)
      return normalized_content_type if accepted_content_types.include?(normalized_content_type)

      extension = File.extname(filename.to_s).downcase
      EXTENSION_CONTENT_TYPES[extension] || normalized_content_type
    end

    def normalize_blob!(blob)
      normalized_content_type = normalize(filename: blob.filename.to_s, content_type: blob.content_type)
      return normalized_content_type if normalized_content_type == blob.content_type

      blob.update!(content_type: normalized_content_type)
      normalized_content_type
    end

    def validation_error
      "must be a #{SOURCE_TYPE_LABEL} file"
    end

    def choose_error
      "Choose #{SOURCE_TYPE_LABEL} images"
    end

    private

    def normalize_content_type(content_type)
      content_type.to_s.split(";").first.to_s.strip.downcase
    end
  end
end
