class PrizeCategory < ApplicationRecord
  include Translatable

  belongs_to :event

  translatable_fields :name
  translation_context "Prize division name for a jiu-jitsu tournament (e.g. weight classes, belt ranks)."
end
