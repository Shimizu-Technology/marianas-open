class EventAccommodation < ApplicationRecord
  belongs_to :event

  validates :hotel_name, presence: true

  scope :active, -> { where(active: true) }
  scope :sorted, -> { order(:sort_order) }
end
