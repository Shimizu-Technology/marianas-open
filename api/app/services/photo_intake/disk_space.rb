require "open3"
require "tmpdir"

module PhotoIntake
  module DiskSpace
    HEADROOM_BYTES = 512.megabytes

    def self.available_bytes
      output, _, status = Open3.capture3("df", "-Pk", Dir.tmpdir)
      value = output.lines.last.to_s.split[3]
      raise Archive::Unsafe, "Cannot verify worker temporary disk space; check df and TMPDIR" unless status.success? && value&.match?(/\A\d+\z/)
      Integer(value, 10) * 1024
    end

    def self.ensure_archive!(byte_size)
      required = byte_size + Archive::MAX_ENTRY_BYTES + HEADROOM_BYTES
      available = available_bytes
      return if available >= required
      raise Archive::Unsafe, "Insufficient worker temporary disk: need #{required} bytes free, have #{available}. Increase Render worker ephemeral storage or upload a smaller ZIP (one import at a time)."
    end
  end
end
