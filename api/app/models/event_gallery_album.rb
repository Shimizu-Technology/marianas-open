class EventGalleryAlbum < ApplicationRecord
  belongs_to :event
  before_validation -> { self.name = name.to_s.squish }
  validates :name, presence: true, length: { maximum: EventGalleryImage::CATEGORY_MAX_LENGTH }, uniqueness: { scope: :event_id }
  validates :sort_order, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  scope :sorted, -> { order(:sort_order, :id) }

  def self.ensure_for!(event, name)
    name = name.to_s.squish
    return if name.blank?

    event.with_lock do
      event.event_gallery_albums.find_or_create_by!(name: name) do |album|
        album.sort_order = event.event_gallery_albums.count
      end
    end
  end

  def move_and_rename!(attributes)
    event.with_lock do
      albums = event.event_gallery_albums.sorted.to_a
      reload
      old_name = name
      assign_attributes(attributes.except("sort_order", :sort_order))
      save!
      if old_name != name
        event.event_gallery_images.where(category: old_name).update_all(category: name, updated_at: Time.current)
      end
      target = attributes["sort_order"] || attributes[:sort_order]
      if target
        raise ArgumentError, "sort_order must be an integer position" unless target.to_s.match?(/\A\d+\z/)
        position = Integer(target)
        raise ArgumentError, "sort_order must be a valid album position" unless position.between?(0, albums.length - 1)
        albums.reject! { |album| album.id == id }
        albums.insert(position, self)
        albums.each_with_index { |album, index| album.update_columns(sort_order: index, updated_at: Time.current) }
      end
      reload
    end
  end

  def summary
    images = event.event_gallery_images.where(category: name)
    cover = images.active.ready.sorted.with_image_variant_records.first
    { id: id, name: name, sort_order: sort_order, count: images.count, cover_url: cover&.thumbnail_url }
  end
end
