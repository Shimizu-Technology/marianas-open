class SiteContent < ApplicationRecord
  validates :key, presence: true, uniqueness: true
  validates :content_type, inclusion: { in: %w[text number rich_text json] }

  def value_for(lang = 'en')
    send("value_#{lang}") || value_en
  rescue NoMethodError
    value_en
  end
end
