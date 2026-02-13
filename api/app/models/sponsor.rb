class Sponsor < ApplicationRecord
  include HasImageUrl

  belongs_to :organization
  has_one_attached :logo

  image_url_for :logo

  def as_json(options = {})
    super(options.merge(
      methods: [:logo_url],
      except: [:created_at, :updated_at]
    ))
  end
end
