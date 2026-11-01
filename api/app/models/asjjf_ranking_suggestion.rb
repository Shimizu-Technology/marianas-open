class AsjjfRankingSuggestion < ApplicationRecord
  belongs_to :source_snapshot, class_name: "AsjjfSnapshot", optional: true
end
