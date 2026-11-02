require "vips"
require "digest"

module PhotoIntake
  class ImageInspection
    Invalid = Class.new(StandardError)
    MAX_PIXELS = 60_000_000


    attr_reader :image, :content_type, :sha256

    def initialize(path)
      signature = File.binread(path, 64)
      @content_type = sniff(signature)
      raise Invalid, "Unsupported image signature" unless content_type
      if (reason = EventGalleryImageUploadPolicy.unsupported_format_error(content_type))
        raise Invalid, reason
      end
      @image = Vips::Image.new_from_file(path, access: :sequential, fail_on: :error)
      raise Invalid, "Unsupported image sample layout" unless image.bands.between?(1, 4) && %i[uchar ushort].include?(image.format)
      raise Invalid, "Image exceeds pixel limit" if image.width * image.height > MAX_PIXELS
      raise Invalid, "Invalid image dimensions" unless image.width.positive? && image.height.positive?
      if image.get_typeof("n-pages").positive? && image.get("n-pages") > 1
        raise Invalid, "Multi-frame images are not supported for intake"
      end
      @path = path
      @sha256 = Digest::SHA256.file(path).hexdigest
    rescue Vips::Error => error
      raise Invalid, "Image decode failed: #{error.message.to_s.first(150)}"
    end

    def review
      # Thumbnail loader uses decoder shrink-on-load; the pixel cap above also
      # bounds formats which cannot shrink while decoding.
      thumb = Vips::Image.thumbnail(@path, 256, height: 256, size: :down, fail_on: :error)
      thumb = thumb.colourspace(:b_w).extract_band(0).cast(:uchar).copy_memory
      width = thumb.width
      height = thumb.height
      pixels = thumb.write_to_memory.unpack("C*")
      flags = self.class.flags_for(pixels, width, height)
      small = thumb.resize(9.0 / width, vscale: 8.0 / height, kernel: :linear).crop(0, 0, 9, 8)
      values = small.write_to_memory.unpack("C*")
      bits = 0
      8.times do |y|
        8.times { |x| bits = (bits << 1) | (values[y * 9 + x] > values[y * 9 + x + 1] ? 1 : 0) }
      end
      { flags: flags, perceptual_hash: "%016x" % bits }
    rescue Vips::Error => error
      raise Invalid, "Image decode failed: #{error.message.to_s.first(150)}"
    end

    def self.flags_for(pixels, width, height)
      values = []
      (1...(height - 1)).each do |y|
        (1...(width - 1)).each do |x|
          index = y * width + x
          values << pixels[index - 1] + pixels[index + 1] + pixels[index - width] + pixels[index + width] - 4 * pixels[index]
        end
      end
      mean = values.sum.fdiv([ values.length, 1 ].max)
      variance = values.sum { |value| (value - mean)**2 }.fdiv([ values.length, 1 ].max)
      flags = []
      flags << "low_sharpness" if variance < 35
      flags << "dark" if pixels.count { |pixel| pixel < 30 }.fdiv(pixels.length) > 0.8
      flags << "overexposed" if pixels.count { |pixel| pixel > 245 }.fdiv(pixels.length) > 0.8
      flags
    end

    def self.near?(left, right)
      (left.to_i(16) ^ right.to_i(16)).digits(2).count(1) <= 5
    end

    private

    def sniff(bytes)
      return "image/jpeg" if bytes.start_with?("\xff\xd8\xff".b)
      return "image/png" if bytes.start_with?("\x89PNG\r\n\x1a\n".b)
      return "image/webp" if bytes.start_with?("RIFF") && bytes.byteslice(8, 4) == "WEBP"
      return "image/gif" if bytes.start_with?("GIF87a", "GIF89a")
      return "image/tiff" if bytes.start_with?("II\x2a\x00".b, "MM\x00\x2a".b)
      if bytes.byteslice(4, 4) == "ftyp"
        brands = bytes.byteslice(8..).to_s
        return "image/avif" if brands.include?("avif") || brands.include?("avis")
        return "image/heic" if %w[heic heix hevc hevx].any? { |brand| brands.include?(brand) }
        return "image/heif" if brands.include?("mif1") || brands.include?("msf1")
      end
      nil
    end
  end
end
