class EventScheduleItem < ApplicationRecord
  include Translatable

  belongs_to :event

  translatable_fields :description
  translation_context "Schedule item for a jiu-jitsu tournament. Brief time-slot description."
end
