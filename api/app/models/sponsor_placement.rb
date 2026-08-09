require "uri"

class SponsorPlacement < ApplicationRecord
  PLACEMENT_TYPES = %w[featured_bar homepage_hero event_hero livestream results gallery].freeze
  MEDIA_KINDS = %w[logo image video].freeze
  ALLOWED_MEDIA_TYPES = %w[image/jpeg image/png image/webp image/gif video/mp4 video/webm].freeze
  MAX_MEDIA_SIZE = 100.megabytes

  belongs_to :sponsor
  belongs_to :season, optional: true
  belongs_to :event, optional: true
  has_one_attached :media

  validates :placement_type, inclusion: { in: PLACEMENT_TYPES }
  validates :media_kind, inclusion: { in: MEDIA_KINDS }
  validates :sort_order, numericality: { only_integer: true }
  validate :end_is_after_start
  validate :event_matches_season
  validate :cta_url_is_safe
  validate :media_is_safe
  validate :featured_bar_media_is_an_image

  scope :active_now, -> {
    now = Time.current
    where(active: true)
      .where("starts_at IS NULL OR starts_at <= ?", now)
      .where("ends_at IS NULL OR ends_at >= ?", now)
  }
  scope :ordered, -> { order(:sort_order, :id) }
  scope :with_display_assets, -> {
    includes(
      :season,
      :event,
      { media_attachment: :blob },
      sponsor: { logo_attachment: :blob }
    )
  }

  def media_url
    return unless media.attached?

    Rails.application.routes.url_helpers.rails_blob_url(media, only_path: true)
  end

  def audit_label
    "#{sponsor.name} #{placement_type.humanize}"
  end

  def as_json(options = {})
    super(options.merge(except: [ :created_at, :updated_at ])).merge(
      "media_url" => media_url,
      "sponsor" => sponsor.as_json
    )
  end

  private

  def end_is_after_start
    return if starts_at.blank? || ends_at.blank? || starts_at <= ends_at

    errors.add(:ends_at, "must be after the start time")
  end

  def event_matches_season
    return if event.blank? || season.blank? || event.season_id == season_id

    errors.add(:event, "must belong to the selected season")
  end

  def cta_url_is_safe
    return if cta_url.blank?

    uri = URI.parse(cta_url)
    return if uri.scheme&.downcase.in?(%w[http https]) && uri.host.present?

    errors.add(:cta_url, "must be a valid HTTP or HTTPS URL")
  rescue URI::InvalidURIError
    errors.add(:cta_url, "must be a valid HTTP or HTTPS URL")
  end

  def media_is_safe
    return unless media.attached?

    errors.add(:media, "must be a JPG, PNG, WebP, GIF, MP4, or WebM file") unless media.blob.content_type.in?(ALLOWED_MEDIA_TYPES)
    errors.add(:media, "must be smaller than 100 MB") if media.blob.byte_size > MAX_MEDIA_SIZE
  end

  def featured_bar_media_is_an_image
    return unless placement_type == "featured_bar" && media.attached?
    return if media.blob.content_type.to_s.start_with?("image/")

    errors.add(:media, "must be an image for a featured bar")
  end
end
