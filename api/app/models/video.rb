class Video < ApplicationRecord
  belongs_to :event, optional: true

  validates :title, presence: true
  validates :youtube_url, presence: true

  before_save :extract_youtube_id

  scope :published, -> { where(status: 'published') }
  scope :featured, -> { where(featured: true) }

  def as_json(options = {})
    merged_except = (Array(options[:except]) + [:created_at, :updated_at]).uniq
    super(options.merge(except: merged_except)).tap do |hash|
      hash['event_name'] = event&.name
    end
  end

  def self.parse_youtube_video_id(url)
    return '' if url.blank?
    if url.match?(/youtu\.be\//)
      url.split('/').last.to_s.split('?').first.to_s
    elsif url.match?(/[?&]v=/)
      url.match(/[?&]v=([^&]+)/).to_a[1].to_s
    else
      ''
    end
  end

  private

  def extract_youtube_id
    parsed = self.class.parse_youtube_video_id(youtube_url)
    self.youtube_video_id = parsed if parsed.present?
  end
end
