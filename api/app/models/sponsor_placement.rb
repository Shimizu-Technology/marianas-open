require "uri"

class SponsorPlacement < ApplicationRecord
  include Translatable

  TYPES = %w[featured_bar presenting secondary official event].freeze
  TIERS = %w[presenting secondary official].freeze
  belongs_to :sponsor, inverse_of: :sponsor_placements
  belongs_to :event, optional: true
  translatable_fields :headline, :blurb
  translation_context "Sponsor messages for the Marianas Open jiu-jitsu tournament website"

  validates :placement_type, inclusion: { in: TYPES }
  validates :display_tier, inclusion: { in: TIERS }
  validates :sort_order, numericality: { only_integer: true }
  validates :headline, length: { maximum: 200 }
  validates :blurb, length: { maximum: 2000 }
  validate :valid_window
  validate :valid_scope
  validate :safe_urls

  scope :active_on, ->(date = Date.current) {
    where("starts_on IS NULL OR starts_on <= ?", date)
      .where("ends_on IS NULL OR ends_on >= ?", date)
  }
  scope :ordered, -> { order(:sort_order, :id) }
  scope :with_assets, -> { includes(sponsor: [ logo_attachment: :blob, logo_dark_attachment: :blob ]) }

  def as_json(options = {})
    super(options.merge(except: [ :created_at, :updated_at ])).merge("sponsor" => sponsor.as_json)
  end

  private

  def valid_window
    errors.add(:ends_on, "must be on or after the start date") if starts_on && ends_on && ends_on < starts_on
  end

  def valid_scope
    errors.add(:event, "is only available for event placements") if event_id && placement_type != "event"
    errors.add(:event, "must belong to the sponsor's organization") if event && sponsor && event.organization_id != sponsor.organization_id
  end

  def safe_urls
    [ :cta_url, :video_url ].each do |field|
      next if self[field].blank?
      begin
        uri = URI.parse(self[field])
        valid = uri.is_a?(URI::HTTP) && uri.host.present? && uri.userinfo.nil?
        if field == :video_url
          valid &&= uri.host.downcase.in?(%w[youtube.com www.youtube.com m.youtube.com youtu.be vimeo.com www.vimeo.com player.vimeo.com])
          valid &&= uri.scheme == "https"
          if valid
            if uri.host.downcase.end_with?("vimeo.com")
              valid &&= uri.path.match?(%r{\A/(?:video/)?\d+\z})
            else
              video_id = if uri.host.downcase == "youtu.be"
                uri.path.delete_prefix("/")
              elsif uri.path.in?([ "/watch", "/watch/" ])
                URI.decode_www_form(uri.query.to_s).to_h["v"]
              else
                uri.path[%r{\A/(?:embed|shorts)/([^/]+)\z}, 1]
              end
              valid &&= video_id.to_s.match?(/\A[a-zA-Z0-9_-]{11}\z/)
            end
          end
        end
        errors.add(field, field == :video_url ? "must be a valid HTTPS YouTube or Vimeo URL" : "must be a valid HTTP or HTTPS URL") unless valid
      rescue URI::InvalidURIError, ArgumentError
        errors.add(field, "must be a valid URL")
      end
    end
  end
end
