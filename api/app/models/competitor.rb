class Competitor < ApplicationRecord
  has_one_attached :photo
  has_many :event_results, dependent: :nullify
  belongs_to :team, class_name: "Academy", foreign_key: "academy_id", optional: true

  validates :first_name, :last_name, presence: true
  validates :belt_rank, inclusion: { in: %w[white blue purple brown black], allow_blank: true }
  validates :country_code, length: { is: 2 }, allow_blank: true

  before_validation :normalize_identity

  scope :search_by_name, ->(query) {
    where("first_name ILIKE :q OR last_name ILIKE :q OR CONCAT(first_name, ' ', last_name) ILIKE :q OR CONCAT(last_name, ' ', first_name) ILIKE :q OR normalized_name LIKE :key OR reverse_normalized_name LIKE :key",
      q: "%#{sanitize_sql_like(query)}%", key: "%#{Identity::NameNormalizer.key(query)}%")
  }
  scope :with_results, -> { where(id: EventResult.select(:competitor_id).distinct) }

  def refresh_current_academy!
    latest = event_results.joins(:event).order("events.date DESC NULLS LAST, events.id DESC, event_results.id DESC").first
    gym = latest&.result_academy || AcademyLinker.resolve(latest&.academy, create: false)
    update_columns(academy_id: gym&.id, academy: gym&.name || latest&.academy)
  end

  def normalize_identity
    self.first_name = Identity::NameNormalizer.person_display(first_name)
    self.last_name = Identity::NameNormalizer.person_display(last_name)
    self.normalized_name = Identity::NameNormalizer.key("#{first_name} #{last_name}")
    self.reverse_normalized_name = Identity::NameNormalizer.key("#{last_name} #{first_name}")
    self.country_code = Identity::CountryCode.normalize(country_code)
  end

  def full_name
    nickname.present? ? "#{first_name} \"#{nickname}\" #{last_name}" : "#{first_name} #{last_name}"
  end

  def photo_url
    return nil unless photo.attached?
    Rails.application.routes.url_helpers.url_for(photo) rescue nil
  end

  def computed_stats
    @computed_stats ||= begin
      results = event_results.joins(:event).select(
        "event_results.placement",
        "event_results.event_id",
        "events.asjjf_stars as event_stars"
      )
      gold = 0; silver = 0; bronze = 0; total_points = 0
      event_ids = Set.new
      results.each do |r|
        stars = r.event_stars || 3
        case r.placement
        when 1 then gold += 1; total_points += RankingCalculator::PLACEMENT_MULTIPLIERS[1] * stars
        when 2 then silver += 1; total_points += RankingCalculator::PLACEMENT_MULTIPLIERS[2] * stars
        when 3 then bronze += 1; total_points += RankingCalculator::PLACEMENT_MULTIPLIERS[3] * stars
        end
        event_ids << r.event_id
      end
      {
        gold: gold, silver: silver, bronze: bronze,
        total_points: total_points,
        events_competed: event_ids.size,
        results_count: results.size
      }
    end
  end

  def as_json(options = {})
    base = super(options.merge(
      methods: [:full_name, :photo_url],
      except: [:created_at, :updated_at]
    ))
    return base if options[:skip_stats]

    stats = computed_stats
    base.merge(
      "total_points" => stats[:total_points],
      "gold_medals" => stats[:gold],
      "silver_medals" => stats[:silver],
      "bronze_medals" => stats[:bronze],
      "events_competed" => stats[:events_competed],
      "results_count" => stats[:results_count]
    )
  end
end
