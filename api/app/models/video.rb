class Video < ApplicationRecord
  belongs_to :event, optional: true

  validates :title, presence: true
  validates :youtube_url, presence: true

  before_save :extract_youtube_id

  scope :published, -> { where(status: 'published') }
  scope :featured, -> { where(featured: true) }

  def as_json(options = {})
    super(options.merge(except: [:created_at, :updated_at])).tap do |hash|
      hash['event_name'] = event&.name
    end
  end

  private

  def extract_youtube_id
    return if youtube_url.blank?
    if youtube_url.match?(/youtu\.be\//)
      self.youtube_video_id = youtube_url.split('/').last.split('?').first
    elsif youtube_url.match?(/[?&]v=/)
      self.youtube_video_id = youtube_url.match(/[?&]v=([^&]+)/)[1]
    end
  end
end
