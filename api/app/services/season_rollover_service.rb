class SeasonRolloverService
  def self.call(source_year:, target_year:, actor:, keep_tagline: false, asjjf_event_ids: {})
    source_year = EventRolloverService.target_year(source_year)
    target_year = EventRolloverService.target_year(target_year)
    raise ArgumentError, "Choose a later target season" unless target_year > source_year
    org = Organization.first!
    events = org.events.where("COALESCE(season_year, EXTRACT(YEAR FROM date)::integer) = ?", source_year).order(:id)
    raise ArgumentError, "No events found in the source season" unless events.exists?
    Event.transaction do
      events.lock.map do |event|
        EventRolloverService.call(source_event: event, target_year: target_year, actor: actor, keep_tagline: keep_tagline,
          asjjf_event_id: asjjf_event_ids[event.id.to_s])
      end
    end
  end
end
