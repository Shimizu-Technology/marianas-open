module PhotoIntake
  class DayProposals
    def initialize(event, album_type, category: nil)
      @event = event
      @type = album_type.to_s.squish
      @source_category = category&.to_s&.squish
      raise ArgumentError, "category must be 80 characters or fewer" if @source_category.to_s.length > 80
      raise ArgumentError, "album_type must be 1–65 characters" if @type.blank? || @type.length > 65
    end

    def call
      proposals = {}
      unassigned = 0
      candidates.find_each do |image|
        category = category_for(image)
        if category
          date = local_date(image)
          proposals[date] ||= { category: category, image_ids: [], date: date.iso8601 }
          proposals[date][:image_ids] << image.id
        else
          unassigned += 1
        end
      end
      { proposals: proposals.sort.map(&:last), unassigned_count: unassigned }
    end

    def category_for(image)
      eligible = if image.album_type.present?
        image.album_type == @type && image.category == image.proposal_base_category
      else
        image.category.blank? || image.category == @type || (@source_category.present? && image.category == @source_category)
      end
      return unless eligible && @event.date
      date = local_date(image)
      return unless date && (@event.date..(@event.end_date || @event.date)).cover?(date)
      "#{@type} Day #{(date - @event.date).to_i + 1}"
    end

    def apply!(submitted)
      raise ArgumentError, "Select at least one proposal" unless submitted.is_a?(Array) && submitted.any?
      @event.with_lock do
        allowed = call[:proposals].to_h { |proposal| [ proposal[:category], proposal[:image_ids] ] }
        ids_seen = []
        changes = submitted.map do |proposal|
          category = proposal[:category] || proposal["category"]
          ids = proposal[:image_ids] || proposal["image_ids"]
          valid = ids.is_a?(Array) && ids.any? && ids.all? { |id| id.is_a?(Integer) && allowed[category]&.include?(id) }
          raise ArgumentError, "Proposal no longer matches derived event days; refresh the preview" unless valid
          raise ArgumentError, "Duplicate proposal image IDs" if (ids_seen & ids).any? || ids.uniq.length != ids.length
          ids_seen.concat(ids)
          [ category, ids ]
        end
        changes.each do |category, ids|
          EventGalleryAlbum.ensure_for!(@event, category)
          @event.event_gallery_images.where(id: ids).update_all(category: category, updated_at: Time.current)
        end
        ids_seen.length
      end
    end

    private

    def local_date(image)
      image.captured_at && CaptureTime.zone(image.capture_timezone.presence || @event.gallery_timezone).utc_to_local(image.captured_at.utc).to_date
    end

    def candidates
      @event.event_gallery_images.where(
        "(album_type = :type AND category IS NOT DISTINCT FROM proposal_base_category) OR " \
        "(album_type IS NULL AND (category IS NULL OR category = '' OR category = :type OR category = :source))", type: @type, source: @source_category
      )
    end
  end
end
