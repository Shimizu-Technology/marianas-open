module PhotoIntake
  module CaptureTime
    module_function

    def zone(name)
      TZInfo::Timezone.get(name.to_s)
    rescue TZInfo::InvalidTimezoneIdentifier
      raise ArgumentError, "timezone must be an IANA identifier"
    end

    def parse(value, timezone)
      match = value.to_s.match(/\A(\d{4}):?(\d{2}):?(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\s|\z)/)
      return unless match

      parts = match.captures.map(&:to_i)
      return unless Date.valid_date?(*parts.first(3)) && parts[3].between?(0, 23) && parts[4].between?(0, 59) && parts[5].between?(0, 59)
      local = Time.utc(*parts)
      zone(timezone).local_to_utc(local)
    rescue TZInfo::PeriodNotFound, TZInfo::AmbiguousTime, ArgumentError
      nil
    end

    def from_image(image, timezone:, zip_time: nil)
      exif = image.get("exif-ifd2-DateTimeOriginal") if image.get_typeof("exif-ifd2-DateTimeOriginal").positive?
      offset = image.get("exif-ifd2-OffsetTimeOriginal").to_s.split.first if image.get_typeof("exif-ifd2-OffsetTimeOriginal").positive?
      captured = if offset&.match?(/\A[+-](?:0\d|1[0-4]):[0-5]\d\z/) && exif.present?
        naive = parse(exif, "Etc/UTC")
        if naive
          sign = offset.start_with?("-") ? -1 : 1
          naive - sign * (offset[1, 2].to_i * 3600 + offset[4, 2].to_i * 60)
        end
      else
        parse(exif, timezone)
      end
      return [ captured, "exif" ] if captured
      captured = parse(zip_time&.strftime("%Y:%m:%d %H:%M:%S"), timezone)
      captured ? [ captured, "zip_mtime" ] : [ nil, nil ]
    end
  end
end
