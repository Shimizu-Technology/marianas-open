class Competitor < ApplicationRecord
  has_one_attached :photo

  validates :first_name, :last_name, presence: true
  validates :belt_rank, inclusion: { in: %w[white blue purple brown black], allow_blank: true }
  validates :country_code, length: { is: 2 }, allow_blank: true

  scope :search_by_name, ->(query) {
    where("first_name ILIKE :q OR last_name ILIKE :q OR CONCAT(first_name, ' ', last_name) ILIKE :q", q: "%#{query}%")
  }

  def full_name
    nickname.present? ? "#{first_name} \"#{nickname}\" #{last_name}" : "#{first_name} #{last_name}"
  end

  def photo_url
    return nil unless photo.attached?
    Rails.application.routes.url_helpers.url_for(photo) rescue nil
  end

  def as_json(options = {})
    super(options.merge(
      methods: [:full_name, :photo_url],
      except: [:created_at, :updated_at]
    ))
  end
end
