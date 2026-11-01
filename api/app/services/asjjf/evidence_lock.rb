module Asjjf
  module EvidenceLock
    # Source-scoped transaction locks serialize snapshot creation/reparsing and
    # results evaluation across events that share a source. Lock in numeric
    # order so a two-source event cannot deadlock another evaluator.
    def self.synchronize(ids)
      ActiveRecord::Base.transaction do
        Array(ids).compact.map(&:to_i).uniq.sort.each do |id|
          label = ActiveRecord::Base.connection.quote("asjjf-results-evidence:#{id}")
          ActiveRecord::Base.connection.execute("SELECT pg_advisory_xact_lock(hashtextextended(#{label}, 0))")
        end
        yield
      end
    end

    def self.for_event(event, &block)
      ids = event.event_asjjf_sources.pluck(:asjjf_event_id) + Array(event.asjjf_event_ids)
      %i[registration_url_gi registration_url_nogi].each do |field|
        value = event.public_send(field)
        next if value.blank?
        ids << Url.parse(value, page_type: "event_info").path.split("/").last.to_i
      rescue ArgumentError
        next
      end
      synchronize(ids, &block)
    end
  end
end
