class EventGalleryImportEntry < ApplicationRecord
  belongs_to :event_gallery_import
  belongs_to :event_gallery_image, optional: true
end
