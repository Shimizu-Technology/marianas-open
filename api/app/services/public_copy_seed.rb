# Frozen deployment defaults, shared by deployment and the standalone seed.
# insert_all skips existing keys, including staff edits, without queuing translation jobs.
class PublicCopySeed
  def self.call
    rows = JSON.parse(Rails.root.join("db/data/public_copy.json").read)
    SiteContent.insert_all(rows.map { |row| row.merge("translation_status" => "translated") }, unique_by: :key)
  end
end
