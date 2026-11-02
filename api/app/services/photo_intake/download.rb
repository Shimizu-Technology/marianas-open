require "digest"
require "base64"
require "tempfile"

module PhotoIntake
  module Download
    def self.open(blob, maximum:)
      raise Archive::Unsafe, "Upload exceeds size limit" if blob.byte_size > maximum
      Tempfile.create([ "photo-intake-", ".bin" ], binmode: true) do |file|
        size = 0
        digest = Digest::MD5.new
        blob.download do |chunk|
          size += chunk.bytesize
          raise Archive::Unsafe, "Uploaded bytes exceed declared size" if size > blob.byte_size || size > maximum
          digest.update(chunk)
          file.write(chunk)
        end
        unless size == blob.byte_size && Base64.strict_encode64(digest.digest) == blob.checksum
          raise Archive::Unsafe, "Upload size/checksum mismatch"
        end
        file.flush
        file.rewind
        yield file
      end
    end
  end
end
