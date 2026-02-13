class EventResult < ApplicationRecord
  belongs_to :event
  belongs_to :competitor, optional: true

  validates :division, presence: true
  validates :placement, presence: true, inclusion: { in: [1, 2, 3] }
  validates :competitor_name, presence: true

  scope :gold, -> { where(placement: 1) }
  scope :silver, -> { where(placement: 2) }
  scope :bronze, -> { where(placement: 3) }
  scope :by_belt, ->(belt) { where(belt_rank: belt) if belt.present? }
  scope :by_gender, ->(gender) { where(gender: gender) if gender.present? }
  scope :by_weight, ->(weight) { where(weight_class: weight) if weight.present? }
  scope :search, ->(q) { where("competitor_name ILIKE ? OR academy ILIKE ?", "%#{q}%", "%#{q}%") if q.present? }

  BELT_RANKS = %w[white blue purple brown black].freeze
  GENDERS = %w[male female].freeze
  AGE_CATEGORIES = %w[juvenile adult master_1 master_2 master_3 master_4 master_5].freeze
  WEIGHT_CLASSES = %w[rooster light_feather feather light middle medium_heavy heavy super_heavy ultra_heavy open_weight].freeze

  def as_json(options = {})
    super(options.merge(except: [:created_at, :updated_at]))
  end
end
