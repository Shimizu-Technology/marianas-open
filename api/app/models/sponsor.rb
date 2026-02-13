class Sponsor < ApplicationRecord
  belongs_to :organization
  has_one_attached :logo

  def logo_url
    return nil unless logo.attached?
    Rails.application.routes.url_helpers.url_for(logo)
  end

  def as_json(options = {})
    super(options.merge(
      methods: [:logo_url],
      except: [:created_at, :updated_at]
    ))
  end
end
