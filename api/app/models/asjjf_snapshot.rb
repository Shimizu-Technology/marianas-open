require "zlib"
require "digest"

class AsjjfSnapshot < ApplicationRecord
  MAX_BYTES = 2.megabytes
  MAX_INFLATED_BYTES = 10.megabytes
  class InflationLimitError < StandardError; end
  belongs_to :uploaded_by_user, class_name: "User", optional: true
  has_many :fetch_requests, class_name: "AsjjfFetchRequest", foreign_key: :snapshot_id, dependent: :nullify
  validates :page_type, inclusion: { in: Asjjf::Url::PAGE_PATHS.keys }
  validates :outcome, inclusion: { in: %w[ok challenged error] }
  validates :source, inclusion: { in: %w[fetcher admin_upload] }
  validates :parse_status, inclusion: { in: %w[pending parsed failed skipped] }
  validates :byte_size, numericality: { greater_than_or_equal_to: 0, less_than_or_equal_to: MAX_BYTES }

  def html=(value)
    bytes = value.to_s
    raise ArgumentError, "HTML exceeds 2 MB" if bytes.bytesize > MAX_BYTES
    self.compressed_html = Zlib::Deflate.deflate(bytes)
    self.byte_size = bytes.bytesize
    self.sha256 = Digest::SHA256.hexdigest(bytes)
  end

  def html
    output = +"".b
    inflater = Zlib::Inflate.new
    inflater.inflate(compressed_html) do |chunk|
      raise InflationLimitError, "Inflated HTML exceeds 10 MiB" if output.bytesize + chunk.bytesize > MAX_INFLATED_BYTES
      output << chunk
    end
    raise Zlib::BufError, "Incomplete compressed HTML" unless inflater.finished?
    output.force_encoding(Encoding::UTF_8)
  ensure
    inflater&.close
  end

  def self.ranking_holds
    latest = where(page_type: %w[individual_ranking individual_ranking_division team_ranking], outcome: "ok", parse_status: "parsed")
      .select("DISTINCT ON (url) id").order(:url, fetched_at: :desc, id: :desc)
    where(id: latest, ranking_apply_status: "rejected").order(fetched_at: :desc, id: :desc)
  end

  def self.prune!(before: 120.days.ago)
    # DISTINCT ON retains one deterministic latest fetch success per URL forever.
    keep = where(outcome: "ok").select("DISTINCT ON (url) id").order(:url, fetched_at: :desc, id: :desc)
    held = ranking_holds.pluck(:id)
    referenced = [ AsjjfRankingList, AsjjfRankingDivision, AsjjfRankingEntry, AsjjfRankingSuggestion ]
      .flat_map { |model| model.where.not(source_snapshot_id: nil).distinct.pluck(:source_snapshot_id) }
    where("created_at < ?", before).where.not(id: keep).where.not(id: referenced + held).find_each(&:destroy!)
  end
end
