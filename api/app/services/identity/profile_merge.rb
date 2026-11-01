module Identity
  # Only descriptive profile data belongs here; identity names and result-derived
  # current academy remain governed by their own merge rules.
  class ProfileMerge
    COMPETITOR_FIELDS = %w[nickname country_code belt_rank weight_class bio instagram_url youtube_url wins losses draws gold_medals silver_medals bronze_medals].freeze
    ACADEMY_FIELDS = %w[country_code location website_url instagram_url facebook_url description unaffiliated].freeze

    def self.fields(record)
      record.is_a?(Competitor) ? COMPETITOR_FIELDS : ACADEMY_FIELDS
    end

    def self.attachment(record)
      record.is_a?(Competitor) ? "photo" : "logo"
    end

    def self.empty?(value)
      value.blank? || value == 0
    end

    def self.values(record)
      data = record.attributes.slice(*fields(record))
      media = record.public_send(attachment(record))
      data[attachment(record)] = media.attached? ? { blob_id: media.blob.id, filename: media.blob.filename.to_s } : nil
      data
    end

    def self.conflicts(source, target)
      source_values = values(source)
      target_values = values(target)
      source_values.filter_map do |field, value|
        other = target_values[field]
        { field: field, source: value, target: other } unless empty?(value) || empty?(other) || value == other
      end
    end

    # Missing choices retain the target. The admin UI sends an explicit choice
    # for every conflict. Audit values retain recoverable blob IDs, not URLs.
    def self.apply(source, target, keep: {})
      choices = keep.to_h.stringify_keys
      valid_fields = fields(source) + [ attachment(source) ]
      unless choices.all? { |field, choice| valid_fields.include?(field) && %w[source target].include?(choice) }
        raise ArgumentError, "Keep choices must name a profile field and source or target"
      end
      source_values = values(source)
      target_values = values(target)
      discarded = {}
      source_values.each do |field, value|
        other = target_values[field]
        use_source = !empty?(value) && (empty?(other) || choices[field] == "source")
        if value != other && !empty?(value) && !empty?(other)
          discarded[field] = { kept: use_source ? "source" : "target", value: use_source ? other : value }
        end
        if field == attachment(source)
          blob = source.public_send(field).blob if value
          # Detach before destroying/replacing so Active Storage never purges a
          # shared or audited blob. Save the new target attachment with the profile.
          source.public_send(field).detach if value
          if use_source
            target.public_send(field).detach if other
            target.public_send("#{field}=", blob)
          end
        elsif use_source
          target.public_send("#{field}=", value)
        end
      end
      discarded
    end
  end
end
