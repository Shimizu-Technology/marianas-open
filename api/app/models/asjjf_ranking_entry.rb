class AsjjfRankingEntry < ApplicationRecord
  belongs_to :asjjf_ranking_list
  belongs_to :asjjf_ranking_division, optional: true
  belongs_to :competitor, optional: true
  belongs_to :academy, optional: true
  belongs_to :source_snapshot, class_name: "AsjjfSnapshot", optional: true
  validates :position, numericality: { only_integer: true, greater_than: 0 }
  validates :name, presence: true
  validates :points, numericality: { greater_than_or_equal_to: 0 }

  def public_json
    as_json(only: %i[id position name academy_name raw_country_code country_code points gold silver bronze competitor_id academy_id])
      .merge(display_name: competitor ? "#{competitor.first_name} #{competitor.last_name}" : name, academy_slug: academy&.slug)
  end
end
