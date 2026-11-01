class EventResult < ApplicationRecord
  belongs_to :result_academy, class_name: "Academy", foreign_key: :academy_id, optional: true
  belongs_to :event
  belongs_to :competitor, optional: true

  before_validation :normalize_identity
  after_save :refresh_current_academy
  after_destroy :refresh_current_academy

  validates :source, inclusion: { in: %w[asjjf manual] }
  validates :discipline, inclusion: { in: %w[gi nogi] }, allow_nil: true
  validates :division, presence: true
  validates :placement, presence: true, inclusion: { in: [1, 2, 3] }
  validates :competitor_name, presence: true

  scope :gold, -> { where(placement: 1) }
  scope :silver, -> { where(placement: 2) }
  scope :bronze, -> { where(placement: 3) }
  scope :by_belt, ->(belt) { where(belt_rank: belt) if belt.present? }
  scope :by_gender, ->(gender) { where(gender: gender) if gender.present? }
  scope :by_weight, ->(weight) { where(weight_class: weight) if weight.present? }
  scope :search, ->(q) {
    if q.present?
      names = Competitor.search_by_name(q).select(:id)
      left_joins(:result_academy).where("event_results.competitor_name ILIKE :q OR event_results.academy ILIKE :q OR academies.name ILIKE :q OR event_results.competitor_id IN (:ids)",
        q: "%#{sanitize_sql_like(q)}%", ids: names)
    end
  }

  BELT_RANKS = %w[white blue purple brown black].freeze
  GENDERS = %w[male female].freeze
  AGE_CATEGORIES = %w[juvenile adult master_1 master_2 master_3 master_4 master_5].freeze
  WEIGHT_CLASSES = %w[rooster light_feather feather light middle medium_heavy heavy super_heavy ultra_heavy open_weight].freeze

  def normalize_identity
    if new_record? || will_save_change_to_competitor_name?
      self.raw_competitor_name = competitor_name
    end
    self.country_code = Identity::CountryCode.normalize(country_code)
    if new_record? || will_save_change_to_academy?
      self.result_academy = AcademyLinker.resolve(academy)
    end
  end

  def refresh_current_academy
    ids = [competitor_id]
    ids << competitor_id_before_last_save if saved_change_to_competitor_id?
    Competitor.where(id: ids.compact.uniq).find_each(&:refresh_current_academy!)
  end

  def display_competitor_name
    competitor&.full_name || Identity::NameNormalizer.person_name(raw_competitor_name.presence || competitor_name)
  end

  def display_academy_name
    result_academy&.name || academy
  end

  def as_json(options = {})
    merged_except = (Array(options[:except]) + [:created_at, :updated_at]).uniq
    super(options.merge(except: merged_except)).merge("display_competitor_name" => display_competitor_name, "country_code" => Identity::CountryCode.normalize(country_code))
  end
end
