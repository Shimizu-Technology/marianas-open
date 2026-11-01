class AsjjfRankingDivision < ApplicationRecord
  belongs_to :asjjf_ranking_list
  belongs_to :source_snapshot, class_name: "AsjjfSnapshot", optional: true
  has_many :asjjf_ranking_entries, dependent: :delete_all

  def public_json
    as_json(only: %i[id asjjf_division_id gender age_group belt label position status last_synced_at])
  end
end
