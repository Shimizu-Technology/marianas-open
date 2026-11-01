class CompetitorAlias < ApplicationRecord
  attr_writer :excluded_canonical_ids

  belongs_to :competitor
  belongs_to :created_by, class_name: "User", optional: true
  validates :raw_name, :normalized_key, presence: true
  validates :normalized_key, uniqueness: true
  validates :source, inclusion: { in: %w[merge rename manual] }
  before_validation { self.normalized_key = Identity::NameNormalizer.key(raw_name) }
  validate :does_not_shadow_canonical_name, if: -> { new_record? || normalized_key_changed? || competitor_id_changed? }

  def self.name_plan(competitor:, names:, excluding_competitor_ids: [])
    excluded = [ competitor.id, *excluding_competitor_ids ]
    names.reject(&:blank?).uniq { |name| Identity::NameNormalizer.key(name) }.filter_map do |name|
      key = Identity::NameNormalizer.key(name)
      next if key.blank? || Identity::NameNormalizer.truncated?(name)
      canonical_ids = Competitor.canonical_name_matches(key).map(&:id) - excluded
      alias_ids = where(normalized_key: key).where.not(competitor_id: excluded).pluck(:competitor_id)
      { raw_name: name, normalized_key: key, competitor_ids: (canonical_ids + alias_ids).uniq.sort }
    end
  end

  # Merge sources are excluded only because they will be removed in the same
  # transaction. Keep provenance when moving an existing approved alias.
  def self.record_names!(competitor:, names:, source:, actor: nil, excluding_competitor_ids: [])
    plan = name_plan(competitor: competitor, names: names, excluding_competitor_ids: excluding_competitor_ids)
    plan.select { |item| item[:competitor_ids].empty? }.each do |item|
      key = item[:normalized_key]
      existing = lock.find_by(normalized_key: key)
      if existing
        # Source canonical names still exist until the merge commits; the plan
        # already checked every other owner before this in-transaction transfer.
        existing.update_columns(competitor_id: competitor.id) if existing.competitor_id != competitor.id
      else
        record = new(competitor: competitor, raw_name: item[:raw_name], source: source, created_by: actor)
        record.excluded_canonical_ids = excluding_competitor_ids
        record.save!
      end
    end
    plan.select { |item| item[:competitor_ids].any? }
  end

  private

  def does_not_shadow_canonical_name
    ids = Competitor.canonical_name_matches(normalized_key).map(&:id) - [ competitor_id, *Array(@excluded_canonical_ids) ]
    errors.add(:normalized_key, "belongs to another athlete's canonical name") if ids.any?
  end
end
