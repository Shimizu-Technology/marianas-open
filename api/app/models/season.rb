class Season < ApplicationRecord
  STATUSES = %w[draft active archived].freeze

  has_many :events, dependent: :restrict_with_error
  has_many :sponsor_placements, dependent: :destroy

  validates :year, presence: true, uniqueness: true, numericality: { only_integer: true, greater_than: 2000, less_than: 2200 }
  validates :name, presence: true
  validates :status, inclusion: { in: STATUSES }
  validate :date_range_is_valid

  scope :ordered, -> { order(year: :desc) }

  def self.current_season
    find_by(current: true) || ordered.first
  end

  before_save :demote_other_current_seasons, if: :current?

  def as_json(options = {})
    super(options.merge(except: [ :created_at, :updated_at ])).merge(
      "events_count" => events.size,
      "ready_events_count" => events.count(&:publishable?)
    )
  end

  private

  def demote_other_current_seasons
    Season.where.not(id: id).where(current: true).update_all(current: false, updated_at: Time.current)
  end

  def date_range_is_valid
    return if starts_on.blank? || ends_on.blank? || starts_on <= ends_on

    errors.add(:ends_on, "must be on or after the start date")
  end
end
