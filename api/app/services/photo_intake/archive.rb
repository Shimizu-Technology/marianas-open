require "zip"
require "zlib"

module PhotoIntake
  class Archive
    Unsafe = Class.new(StandardError)
    MAX_BYTES = 4.gigabytes
    MAX_ENTRIES = 10_000
    MAX_ENTRY_BYTES = [ 50.megabytes, EventGalleryImage::MAX_BYTE_SIZE ].min
    MAX_TOTAL_BYTES = 8.gigabytes
    MAX_RATIO = 100
    MAX_DIRECTORY_BYTES = 16.megabytes
    CHUNK_BYTES = 64.kilobytes

    attr_reader :entries

    def initialize(path)
      @path = path
      @entries = []
      File.open(path, "rb") do |io|
        raise Unsafe, "Archive exceeds 4 GiB" if io.size > MAX_BYTES
        count, offset, length = directory_location(io)
        raise Unsafe, "Too many archive entries" if count > MAX_ENTRIES
        raise Unsafe, "Archive directory is too large" if length > MAX_DIRECTORY_BYTES
        raise Unsafe, "Invalid archive directory bounds" unless offset >= 0 && offset + length <= io.size
        io.seek(offset)
        count.times do
          start = io.pos
          header = exact_read(io, 46)
          raise Unsafe, "Invalid central directory" unless header.start_with?("PK\x01\x02".b)
          name_length, extra_length, comment_length = header.byteslice(28, 6).unpack("v3")
          raise Unsafe, "Oversized archive metadata" if name_length > 1024 || extra_length > 4096 || comment_length > 1024
          raw_name = exact_read(io, name_length)
          validate_path!(raw_name)
          io.seek(start)
          entry = Zip::Entry.new(path)
          entry.read_c_dir_entry(io)
          raise Unsafe, "Invalid directory entry bounds" if io.pos > offset + length
          @entries << entry
        end
        raise Unsafe, "Directory size mismatch" unless io.pos == offset + length
        @directory_offset = offset
        validate_entries!(io)
      end
    rescue Zip::Error, Zlib::Error, EOFError, ArgumentError => error
      raise Unsafe, "Invalid ZIP: #{error.message.to_s.first(200)}"
    end

    # Never use an entry name as a filesystem path. Deflate's block API emits
    # bounded chunks even when a malicious compressed block expands massively.
    def extract(entry, output)
      size = 0
      crc = 0
      write = lambda do |chunk|
        size += chunk.bytesize
        raise Unsafe, "Expanded entry exceeds size limit" if size > MAX_ENTRY_BYTES || size > entry.size
        raise Unsafe, "Expanded entry exceeds ratio limit" if size > [ entry.compressed_size, 1 ].max * MAX_RATIO
        crc = Zlib.crc32(chunk, crc)
        output.write(chunk)
      end
      File.open(@path, "rb") do |input|
        input.seek(@data_offsets.fetch(entry.local_header_offset))
        remaining = entry.compressed_size
        inflater = Zlib::Inflate.new(-Zlib::MAX_WBITS) if entry.compression_method == 8
        begin
          while remaining.positive?
            chunk = exact_read(input, [ remaining, CHUNK_BYTES ].min)
            remaining -= chunk.bytesize
            inflater ? inflater.inflate(chunk, &write) : write.call(chunk)
          end
          if inflater && (!inflater.finished? || inflater.total_in != entry.compressed_size)
            raise Unsafe, "Invalid deflate stream"
          end
        ensure
          inflater&.close
        end
      end
      raise Unsafe, "Entry size or CRC mismatch" unless size == entry.size && crc == entry.crc
      output.flush
      output.rewind
      size
    rescue Zlib::Error, EOFError => error
      raise Unsafe, "Corrupt entry: #{error.message.to_s.first(200)}"
    end

    private

    def exact_read(io, length)
      value = io.read(length)
      raise EOFError, "Truncated ZIP" unless value && value.bytesize == length
      value
    end

    def directory_location(io)
      tail_size = [ io.size, 65_557 ].min
      io.seek(-tail_size, IO::SEEK_END)
      tail = io.read(tail_size)
      position = tail.rindex("PK\x05\x06".b)
      raise Unsafe, "ZIP end record missing" unless position && position + 22 <= tail.bytesize
      fields = tail.byteslice(position, 22).unpack("VvvvvVVv")
      _, disk, directory_disk, disk_count, count, length, offset, comment = fields
      raise Unsafe, "Invalid or multi-disk ZIP" unless disk.zero? && directory_disk.zero? && disk_count == count && position + 22 + comment == tail.bytesize
      if count == 0xffff || length == 0xffffffff || offset == 0xffffffff
        end_position = io.size - tail_size + position
        raise Unsafe, "Missing ZIP64 locator" if end_position < 20
        io.seek(end_position - 20)
        signature, zip_disk, zip_offset, disks = exact_read(io, 20).unpack("VVQ<V")
        raise Unsafe, "Invalid ZIP64 locator" unless signature == 0x07064b50 && zip_disk.zero? && disks == 1
        io.seek(zip_offset)
        values = exact_read(io, 56).unpack("VQ<vvVVQ<Q<Q<Q<")
        signature, record_size, _, _, disk, directory_disk, disk_count, count, length, offset = values
        raise Unsafe, "Invalid ZIP64 record" unless signature == 0x06064b50 && record_size == 44 && disk.zero? && directory_disk.zero? && disk_count == count && zip_offset + 56 == end_position - 20
      end
      [ count, offset, length ]
    end

    def validate_path!(raw)
      name = raw.dup.force_encoding(Encoding::UTF_8)
      parts = name.split("/", -1)
      bad = !name.valid_encoding? || name.empty? || name.match?(/[\x00-\x1f\x7f\\:]/) || name.start_with?("/") || parts.include?("..") || parts.include?(".") || parts[0...-1].include?("")
      raise Unsafe, "Unsafe archive path" if bad
    end

    def validate_entries!(io)
      names = {}
      total = 0
      compressed = 0
      @data_offsets = {}
      ranges = []
      entries.each do |entry|
        raise Unsafe, "Duplicate archive path" if names[entry.name]
        names[entry.name] = true
        raise Unsafe, "Encrypted/unsupported ZIP flags" unless (entry.gp_flags & ~0x080e).zero?
        raise Unsafe, "Unsupported compression" unless [ 0, 8 ].include?(entry.compression_method)
        unix_type = (entry.external_file_attributes >> 16) & 0o170000
        raise Unsafe, "Symlink or special file in archive" unless [ 0, 0o100000, 0o040000 ].include?(unix_type) && (entry.file? || entry.directory?)
        raise Unsafe, "Entry exceeds size limit" if entry.size > MAX_ENTRY_BYTES
        raise Unsafe, "Entry exceeds compression ratio limit" if entry.size > [ entry.compressed_size, 1 ].max * MAX_RATIO
        total += entry.size
        compressed += entry.compressed_size
        raise Unsafe, "Archive exceeds extracted size limit" if total > MAX_TOTAL_BYTES
        data_offset = validate_local_header!(io, entry)
        @data_offsets[entry.local_header_offset] = data_offset
        ranges << [ entry.local_header_offset, data_offset + entry.compressed_size ]
      end
      raise Unsafe, "Archive exceeds compression ratio limit" if total > [ compressed, 1 ].max * MAX_RATIO
      ranges.sort.each_cons(2) { |left, right| raise Unsafe, "Overlapping ZIP entries" if left[1] > right[0] }
    end

    def validate_local_header!(io, entry)
      offset = entry.local_header_offset
      raise Unsafe, "Invalid local header offset" unless offset >= 0 && offset + 30 <= @directory_offset
      io.seek(offset)
      values = exact_read(io, 30).unpack("VvvvvvVVVvv")
      signature, _, flags, method, _, _, crc, compressed_size, size, name_length, extra_length = values
      raise Unsafe, "Local header mismatch" unless signature == 0x04034b50 && flags == entry.gp_flags && method == entry.compression_method
      raise Unsafe, "Oversized local metadata" if name_length > 1024 || extra_length > 4096
      name = exact_read(io, name_length)
      validate_path!(name)
      raise Unsafe, "Local filename mismatch" unless name.b == entry.name.b
      extra = exact_read(io, extra_length)
      # Validate ZIP64 local sizes when not deferred to a data descriptor.
      unless (flags & 8).positive?
        if size == 0xffffffff || compressed_size == 0xffffffff
          zip64 = nil
          position = 0
          while position < extra.bytesize
            raise Unsafe, "Truncated ZIP extra field" if position + 4 > extra.bytesize
            tag, length = extra.byteslice(position, 4).unpack("vv")
            position += 4
            raise Unsafe, "Truncated ZIP extra field" if position + length > extra.bytesize
            zip64 = extra.byteslice(position, length) if tag == 1
            position += length
          end
          raise Unsafe, "Missing ZIP64 local sizes" unless zip64
          if size == 0xffffffff
            raise Unsafe, "Missing ZIP64 local size" if zip64.bytesize < 8
            size = zip64.slice!(0, 8).unpack1("Q<")
          end
          if compressed_size == 0xffffffff
            raise Unsafe, "Missing ZIP64 compressed size" if zip64.bytesize < 8
            compressed_size = zip64.unpack1("Q<")
          end
        end
        raise Unsafe, "Local size/CRC mismatch" unless crc == entry.crc && compressed_size == entry.compressed_size && size == entry.size
      end
      data_offset = io.pos
      raise Unsafe, "Entry overlaps directory" if data_offset + entry.compressed_size > @directory_offset
      data_offset
    end
  end
end
