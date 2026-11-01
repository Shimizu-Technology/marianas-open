require "uri"

class BackfillEventAsjjfSources < ActiveRecord::Migration[8.0]
  def up
    # Migration-local records avoid callbacks, translations, and future model changes.
    event_class = Class.new(ActiveRecord::Base) { self.table_name = "events" }
    source_class = Class.new(ActiveRecord::Base) { self.table_name = "event_asjjf_sources" }
    event_class.find_each do |event|
      sources = Array(event.asjjf_event_ids).filter_map do |id|
        next unless id.to_s.match?(/\A[1-9]\d*\z/)
        [ id.to_i, "unknown", "asjjf_event_ids" ]
      end
      { registration_url_gi: "gi", registration_url_nogi: "nogi" }.each do |field, discipline|
        uri = URI.parse(event.public_send(field).to_s.strip)
        next unless uri.scheme == "https" && %w[asjjf.org dumau.asjjf.org].include?(uri.host)
        id = uri.path.match(%r{\A/main/eventInfo/([1-9]\d*)/?\z})&.[](1)
        sources << [ id.to_i, discipline, "registration_url" ] if id
      rescue URI::InvalidURIError
        next
      end
      sources.each do |id, discipline, derived_from|
        source = source_class.find_or_initialize_by(event_id: event.id, asjjf_event_id: id)
        next if source.persisted? && (discipline == "unknown" || source.derived_from == "admin")
        source.assign_attributes(discipline: discipline, derived_from: derived_from)
        source.save!
      end
    end
  end

  def down
    # Source records may have been corrected by an administrator; preserve them.
  end
end
