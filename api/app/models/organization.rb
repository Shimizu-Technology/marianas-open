class Organization < ApplicationRecord
  has_many :events, dependent: :destroy
  has_many :sponsors, dependent: :destroy
  has_one_attached :logo
  has_one_attached :banner

  def logo_url
    return nil unless logo.attached?
    Rails.application.routes.url_helpers.url_for(logo) rescue nil
  end

  def banner_url
    return nil unless banner.attached?
    Rails.application.routes.url_helpers.url_for(banner) rescue nil
  end

  def as_json(options = {})
    super(options.merge(
      methods: [:logo_url, :banner_url],
      except: [:created_at, :updated_at]
    ))
  end
end
