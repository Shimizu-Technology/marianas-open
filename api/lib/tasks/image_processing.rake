namespace :image_processing do
  desc "Verify native image processing support required for gallery uploads"
  task verify: :environment do
    require "vips"

    required_operations = %w[
      jpegload
      jpegsave
      pngload
      webpload
      gifload
      tiffload
      heifload
    ]

    missing = required_operations.reject { |operation| Vips.type_find("VipsOperation", operation).present? }
    if missing.any?
      abort "Missing libvips image operations: #{missing.join(", ")}"
    end

    puts "libvips #{Vips.version_string} supports required gallery image operations"
  end
end
