class AsjjfRankingSeason < ApplicationRecord
  has_many :asjjf_ranking_lists, dependent: :destroy
  validates :season_year, numericality: { only_integer: true, greater_than_or_equal_to: 2000, less_than_or_equal_to: 2100 }, uniqueness: true
  validates :gi_ranking_id, :nogi_ranking_id, :team_ranking_id, :team_nogi_ranking_id,
    numericality: { only_integer: true, greater_than: 0 }, allow_nil: true

  def self.current_season
    find_by(current: true)
  end

  def sync_lists!
    configs = [ [ gi_ranking_id, "gi", "individual", "adult" ], [ nogi_ranking_id, "nogi", "individual", "adult" ],
      [ team_ranking_id, "gi", "team", "adult" ], [ team_ranking_id, "gi", "team", "kids" ],
      [ team_nogi_ranking_id, "nogi", "team", "adult" ], [ team_nogi_ranking_id, "nogi", "team", "kids" ] ]
    keep = configs.filter_map do |source_id, discipline, kind, category|
      next unless source_id
      list = asjjf_ranking_lists.find_or_initialize_by(discipline: discipline, kind: kind, category: category)
      # An edited source must never publish data from the previous ranking ID.
      if list.persisted? && list.asjjf_ranking_id != source_id
        list.asjjf_ranking_entries.delete_all
        list.asjjf_ranking_divisions.destroy_all
        list.assign_attributes(status: "pending", last_synced_at: nil, source_snapshot_id: nil)
      end
      list.update!(asjjf_ranking_id: source_id, season_year: season_year,
        title: "Marianas Pro #{discipline == 'nogi' ? 'No-Gi ' : ''}Ranking #{season_year}")
      list.id
    end
    asjjf_ranking_lists.where.not(id: keep).destroy_all
  end
end
