class Academy < ApplicationRecord
  has_one_attached :logo
  has_many :competitors, dependent: :nullify
  has_many :event_results, dependent: :nullify
  belongs_to :parent, class_name: "Academy", optional: true
  has_many :children, class_name: "Academy", foreign_key: :parent_id, dependent: :nullify
  has_many :candidate_identity_reviews, class_name: "IdentityReview", foreign_key: :candidate_academy_id, dependent: :nullify
  has_many :resolved_identity_reviews, class_name: "IdentityReview", foreign_key: :resolved_academy_id, dependent: :nullify

  validates :name, presence: true
  validates :slug, presence: true, uniqueness: true
  validates :country_code, length: { is: 2 }, allow_blank: true

  before_validation :normalize_identity
  validate :new_identity_is_unique, if: -> { new_record? || name_changed? }
  validate :new_aliases_are_unique
  validate :parent_is_acyclic

  before_validation :generate_slug, if: -> { slug.blank? }

  scope :search_by_name, ->(query) {
    where(
      "academies.name ILIKE ? OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(academies.aliases) AS a WHERE a ILIKE ?)",
      "%#{query}%", "%#{query}%"
    )
  }

  def self.identity_matches(value)
    key = Identity::NameNormalizer.key(value)
    return [] if key.blank?
    all.select do |academy|
      Identity::NameNormalizer.key(academy.name) == key ||
        Array(academy.aliases).any? { |name| Identity::NameNormalizer.key(name) == key }
    end
  end

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

  def normalize_identity
    self.name = Identity::NameNormalizer.display(name)
    self.normalized_name = Identity::NameNormalizer.key(name)
    self.country_code = Identity::CountryCode.normalize(country_code)
    self.aliases = Array(aliases).map { |value| Identity::NameNormalizer.display(value) }.reject(&:blank?).uniq
  end

  def new_identity_is_unique
    matches = self.class.identity_matches(name).reject { |academy| academy.id == id }
    errors.add(:name, "already exists as an academy or alias") if matches.any?
  end

  def new_aliases_are_unique
    old_keys = Array(aliases_in_database).map { |name| Identity::NameNormalizer.key(name) }
    added = Array(aliases).map { |name| Identity::NameNormalizer.key(name) } - old_keys
    others = self.class.where.not(id: id).to_a
    if added.any? { |key| others.any? { |academy| ([academy.name] + Array(academy.aliases)).any? { |name| Identity::NameNormalizer.key(name) == key } } }
      errors.add(:aliases, "conflict with another academy name or alias")
    end
  end

  def parent_is_acyclic
    seen = [id].compact
    node = parent
    while node
      if seen.include?(node.id)
        errors.add(:parent, "cannot create a cycle")
        break
      end
      seen << node.id
      node = node.parent
    end
  end

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
