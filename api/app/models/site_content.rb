class SiteContent < ApplicationRecord
  TRANSLATION_STATUSES = %w[translated pending failed].freeze

  validates :key, presence: true, uniqueness: true
  validates :content_type, inclusion: { in: %w[text number rich_text json] }
  validates :translation_status, inclusion: { in: TRANSLATION_STATUSES }

  after_commit :enqueue_translation, on: [:create, :update], if: :english_value_changed?

  def value_for(lang = 'en')
    send("value_#{lang}") || value_en
  rescue NoMethodError
    value_en
  end

  private

  def english_value_changed?
    @_english_changed == true
  end

  def enqueue_translation
    return if value_en.blank?

    service = GtTranslationService.new
    return unless service.configured?

    update_column(:translation_status, "pending")
    TranslateSiteContentJob.perform_later(id)
  ensure
    @_english_changed = nil
  end

  before_save :track_english_change

  def track_english_change
    @_english_changed = will_save_change_to_attribute?(:value_en)
  end
end
