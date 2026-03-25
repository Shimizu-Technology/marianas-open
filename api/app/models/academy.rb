class Academy < ApplicationRecord
  has_one_attached :logo
  has_many :competitors, dependent: :nullify

  validates :name, presence: true
  validates :slug, presence: true, uniqueness: true
  validates :country_code, length: { is: 2 }, allow_blank: true

  before_validation :generate_slug, if: -> { slug.blank? || name_changed? }

  scope :search_by_name, ->(query) {
    where("name ILIKE ?", "%#{query}%")
  }

  scope :with_competitors, -> { where(id: Competitor.where.not(academy_id: nil).select(:academy_id).distinct) }

  def logo_url
    return nil unless logo.attached?
    Rails.application.routes.url_helpers.url_for(logo) rescue nil
  end

  def as_json(options = {})
    super(options.merge(
      methods: [:logo_url],
      except: [:created_at, :updated_at]
    ))
  end

  private

  def generate_slug
    base = name.to_s.parameterize
    self.slug = base
    counter = 1
    while Academy.where(slug: slug).where.not(id: id).exists?
      self.slug = "#{base}-#{counter}"
      counter += 1
    end
  end
end
