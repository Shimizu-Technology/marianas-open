class PublicEventLoader
  GALLERY_PREVIEW_LIMIT = 8
  EVENT_INCLUDES = [
    :event_schedule_items,
    :prize_categories,
    { event_accommodations: { image_attachment: :blob } },
    { hero_image_attachment: :blob },
    { poster_image_attachment: :blob },
    { ticket_banner_image_attachment: :blob }
  ].freeze

  def self.load(scope)
    new(scope).load
  end

  def initialize(scope)
    @scope = scope
  end

  def load
    events = @scope.includes(*EVENT_INCLUDES).to_a
    return events if events.empty?

    previews_by_event = gallery_previews(events.map(&:id)).group_by(&:event_id)
    events.each do |event|
      previews = previews_by_event.fetch(event.id, [])
      event.preload_public_gallery(
        count: previews.first&.public_gallery_images_count.to_i,
        preview_images: previews
      )
    end

    events
  end

  private

  def gallery_previews(event_ids)
    ranked_images = EventGalleryImage
      .active
      .ready
      .where(event_id: event_ids)
      .select(<<~SQL.squish)
        event_gallery_images.*,
        ROW_NUMBER() OVER (
          PARTITION BY event_gallery_images.event_id
          ORDER BY event_gallery_images.sort_order, event_gallery_images.id
        ) AS preview_position,
        COUNT(*) OVER (
          PARTITION BY event_gallery_images.event_id
        ) AS public_gallery_images_count
      SQL

    EventGalleryImage
      .from("(#{ranked_images.to_sql}) event_gallery_images")
      .where("preview_position <= ?", GALLERY_PREVIEW_LIMIT)
      .with_image_variant_records
      .order(:event_id, :sort_order, :id)
      .to_a
  end
end
