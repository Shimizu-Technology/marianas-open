class SeasonRolloverService
  def self.call(source_season:, target_year:, actor: nil, copy_sponsors: true)
    new(source_season:, target_year:, actor:, copy_sponsors:).call
  end

  def initialize(source_season:, target_year:, actor:, copy_sponsors:)
    @source_season = source_season
    @target_year = Integer(target_year)
    @actor = actor
    @copy_sponsors = copy_sponsors
  end

  def call
    raise ArgumentError, "Target year must be after the source season" if target_year <= source_season.year

    raise ArgumentError, "The #{target_year} season already exists" if Season.exists?(year: target_year)

    target_season = Season.new(year: target_year)
    target_season.assign_attributes(
      name: source_season.name.gsub(source_season.year.to_s, target_year.to_s),
      description: source_season.description,
      status: "draft",
      current: false,
      starts_on: Date.new(target_year, 1, 1),
      ends_on: Date.new(target_year, 12, 31)
    )

    event_plans = []
    source_season.events.order(:date, :id).each do |event|
      prepared_attachments = EventRolloverService.prepare_attachments(source_event: event)
      event_plans << [ event, prepared_attachments ]
    end

    sponsor_placement_plans = []
    if copy_sponsors
      source_season.sponsor_placements.find_each do |placement|
        prepared_media = BlobCopyService.call(placement.media.blob) if placement.media.attached?
        sponsor_placement_plans << [ placement, prepared_media ]
      end
    end

    events = []
    event_map = {}
    rollover_committed = false
    ActiveRecord::Base.transaction do
      target_season.save!
      event_plans.each do |event, prepared_attachments|
        copy = EventRolloverService.call(
          source_event: event,
          target_season: target_season,
          prepared_attachments: prepared_attachments
        )
        events << copy
        event_map[event.id] = copy
      end
      copy_sponsor_placements(target_season, event_map, sponsor_placement_plans) if copy_sponsors
      AuditLog.record!(
        actor: actor,
        action: "rollover",
        auditable: target_season,
        changes: { source_season_id: source_season.id, event_ids: events.map(&:id) }
      )
    end
    rollover_committed = true

    { season: target_season.reload, events: events }
  rescue StandardError
    unless rollover_committed
      event_plans&.each do |_event, prepared_attachments|
        EventRolloverService.purge_prepared_attachments(prepared_attachments)
      end
      sponsor_placement_plans&.each do |_placement, prepared_media|
        prepared_media&.purge
      end
    end
    raise
  end

  private

  attr_reader :source_season, :target_year, :actor, :copy_sponsors

  def copy_sponsor_placements(target_season, event_map, sponsor_placement_plans)
    return unless @copy_sponsors

    sponsor_placement_plans.each do |placement, prepared_media|
      copy = placement.dup
      copy.assign_attributes(
        season: target_season,
        event: placement.event_id ? event_map[placement.event_id] : nil,
        starts_at: nil,
        ends_at: nil,
        active: false,
        impressions_count: 0,
        clicks_count: 0
      )
      copy.save!
      copy.media.attach(prepared_media) if prepared_media
    end
  end
end
