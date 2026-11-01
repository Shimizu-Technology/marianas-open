class Sponsor < ApplicationRecord
  include HasImageUrl

  belongs_to :organization
  has_one_attached :logo
  has_one_attached :logo_dark
  has_many :sponsor_placements, dependent: :destroy, inverse_of: :sponsor
  accepts_nested_attributes_for :sponsor_placements, allow_destroy: true

  validates :name, presence: true, length: { maximum: 200 }
  validate :safe_website, if: -> { new_record? || will_save_change_to_website_url? }
  validate :safe_logos

  def safe_website
    return if website_url.blank?

    uri = URI.parse(website_url)
    errors.add(:website_url, "must be an HTTP or HTTPS URL") unless uri.is_a?(URI::HTTP) && uri.host.present? && uri.userinfo.nil?
  rescue URI::InvalidURIError
    errors.add(:website_url, "must be a valid URL")
  end

  def safe_logos
    [:logo, :logo_dark].each do |field|
      next unless attachment_changes.key?(field.to_s)

      image = public_send(field)
      next unless image.attached?

      errors.add(field, "must be a PNG, JPEG, WebP, or GIF under 10 MB") unless image.blob.content_type.in?(%w[image/png image/jpeg image/webp image/gif]) && image.blob.byte_size <= 10.megabytes
    end
  end

  image_url_for :logo, :logo_dark

  def as_json(options = {})
    super(options.merge(
      methods: [:logo_url, :logo_dark_url],
      except: [:created_at, :updated_at]
    ))
  end
end
