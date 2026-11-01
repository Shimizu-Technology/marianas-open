class CompetitorAlias < ApplicationRecord
  belongs_to :competitor
  belongs_to :created_by, class_name: "User", optional: true
  validates :raw_name, :normalized_key, presence: true
  validates :normalized_key, uniqueness: true
  validates :source, inclusion: { in: %w[merge rename manual] }
  before_validation { self.normalized_key = Identity::NameNormalizer.key(raw_name) }

  def self.record_names!(competitor:, names:, source:, actor: nil)
    names.reject(&:blank?).each do |name|
      key = Identity::NameNormalizer.key(name)
      next if key.blank? || Identity::NameNormalizer.truncated?(name)
      existing = lock.find_by(normalized_key: key)
      if existing && existing.competitor_id != competitor.id
        raise ArgumentError, "Approved alias #{name.inspect} belongs to another athlete; resolve it before merging or renaming"
      end
      create!(competitor: competitor, raw_name: name, source: source, created_by: actor) unless existing
    end
  end
end
