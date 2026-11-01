class AsjjfRankingList < ApplicationRecord
  belongs_to :asjjf_ranking_season
  belongs_to :source_snapshot, class_name: "AsjjfSnapshot", optional: true
  has_many :asjjf_ranking_entries, dependent: :delete_all
  has_many :asjjf_ranking_divisions, dependent: :destroy
  validates :kind, inclusion: { in: %w[individual team] }
  validates :discipline, inclusion: { in: %w[gi nogi] }
  validates :category, inclusion: { in: %w[adult kids] }
  validates :status, inclusion: { in: %w[pending available unavailable] }

  def source_url
    Asjjf::Url.build(kind == "team" ? "team_ranking" : "individual_ranking", asjjf_ranking_id) +
      (kind == "team" && category == "kids" ? "?rankType=kids" : "")
  end

  def public_json
    as_json(only: %i[id asjjf_ranking_id season_year circuit discipline kind category title status last_synced_at]).merge(source_url: source_url)
  end
end
