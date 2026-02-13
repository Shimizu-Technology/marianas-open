class Organization < ApplicationRecord
  include HasImageUrl

  has_many :events, dependent: :destroy
  has_many :sponsors, dependent: :destroy
  has_one_attached :logo
  has_one_attached :banner

  image_url_for :logo, :banner

  def as_json(options = {})
    super(options.merge(
      methods: [:logo_url, :banner_url],
      except: [:created_at, :updated_at]
    ))
  end
end
