require "zlib"
require "vips"

module PhotoIntakeFixtures
  def image_bytes(value: 128, exif: nil, offset: nil, format: ".png")
    pixels = Array.new(64 * 64) { |i| value == :noise ? (i * 71 + i / 64 * 31) % 256 : value }.pack("C*")
    image = Vips::Image.new_from_memory(pixels, 64, 64, 1, :uchar).copy
    image.set_type(GObject::GSTR_TYPE, "exif-ifd2-DateTimeOriginal", exif) if exif
    image.set_type(GObject::GSTR_TYPE, "exif-ifd2-OffsetTimeOriginal", offset) if offset
    image.write_to_buffer(format)
  end

  # Small standard ZIP fixtures, intentionally permitting hostile metadata that
  # normal ZIP writers sanitize. Supports data descriptors and mismatched headers.
  def zip_bytes(files)
    body = +"".b
    directory = +"".b
    files.each do |options|
      name = options.fetch(:name).b
      data = options.fetch(:data, "").b
      method = options.fetch(:method, 8)
      compressed = if method == 8
        deflater = Zlib::Deflate.new(6, -Zlib::MAX_WBITS)
        result = deflater.deflate(data, Zlib::FINISH)
        deflater.close
        result
      else
        data
      end
      size = options.fetch(:size, data.bytesize)
      crc = options.fetch(:crc, Zlib.crc32(data))
      flags = options.fetch(:flags, 0)
      offset = body.bytesize
      year, month, day, hour, minute, second = options.fetch(:time, [ 2027, 1, 30, 12, 0, 0 ])
      date = ((year - 1980) << 9) | (month << 5) | day
      time = (hour << 11) | (minute << 5) | (second / 2)
      local_name = options.fetch(:local_name, name).b
      descriptor = (flags & 8).positive?
      body << [ 0x04034b50, 20, flags, method, time, date, descriptor ? 0 : crc,
        descriptor ? 0 : compressed.bytesize, descriptor ? 0 : size, local_name.bytesize, 0 ].pack("VvvvvvVVVvv") << local_name << compressed
      body << [ 0x08074b50, crc, compressed.bytesize, size ].pack("V4") if descriptor
      directory << [ 0x02014b50, (3 << 8) | 20, 20, flags, method, time, date, crc, compressed.bytesize, size,
        name.bytesize, 0, 0, 0, 0, options.fetch(:attributes, 0o100644 << 16), offset ].pack("VvvvvvvVVVvvvvvVV") << name
    end
    body + directory + [ 0x06054b50, 0, 0, files.length, files.length, directory.bytesize, body.bytesize, 0 ].pack("VvvvvVVv")
  end

  def with_archive(bytes)
    Tempfile.create([ "photo-test-", ".zip" ], binmode: true) do |file|
      file.write(bytes)
      file.flush
      yield PhotoIntake::Archive.new(file.path)
    end
  end

  def attach_image(event, bytes: image_bytes, **attributes)
    image = event.event_gallery_images.build({ status: "uploaded", original_filename: "fixture.png" }.merge(attributes))
    image.image.attach(io: StringIO.new(bytes), filename: image.original_filename, content_type: "image/png")
    image.save!
    image
  end

  def create_import(event, files:, **attributes)
    bytes = zip_bytes(files)
    blob = ActiveStorage::Blob.create_and_upload!(io: StringIO.new(bytes), filename: "photos.zip", content_type: "application/zip")
    import = event.event_gallery_imports.build({ source_blob_id: blob.id, prepared_by_id: 1, filename: "photos.zip",
      album_type: "Podium", category: "Podium", timezone: "Pacific/Guam" }.merge(attributes))
    import.archive.attach(blob)
    import.save!
    import
  end
end
