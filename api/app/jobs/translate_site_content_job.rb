class TranslateSiteContentJob < ApplicationJob
  queue_as :default
  retry_on GtTranslationService::TranslationError, wait: :polynomially_longer, attempts: 3

  def perform(site_content_id)
    content = SiteContent.find_by(id: site_content_id)
    return if content.blank? || content.value_en.blank?

    service = GtTranslationService.new
    unless service.configured?
      Rails.logger.warn("[TranslateSiteContentJob] GT API not configured, skipping SiteContent##{site_content_id}")
      return
    end

    translations = service.translate_fields(
      { "value" => content.value_en },
      context: "Short CMS content for a Brazilian Jiu-Jitsu tournament website. Keep translations concise."
    )

    locale_map = translations["value"] || {}
    attrs = {}
    attrs[:value_ja] = locale_map["ja"] if locale_map["ja"].present?
    attrs[:value_ko] = locale_map["ko"] if locale_map["ko"].present?
    attrs[:value_zh] = locale_map["zh"] if locale_map["zh"].present?
    attrs[:value_tl] = locale_map["tl"] if locale_map["tl"].present?
    attrs[:value_pt] = locale_map["pt"] if locale_map["pt"].present?
    attrs[:translation_status] = "translated"

    content.update_columns(attrs) if attrs.any?
    Rails.logger.info("[TranslateSiteContentJob] Translated SiteContent##{site_content_id} (#{content.key}): #{locale_map.keys.join(', ')}")
  rescue GtTranslationService::TranslationError => e
    Rails.logger.error("[TranslateSiteContentJob] Failed SiteContent##{site_content_id}: #{e.message}")
    content&.update_column(:translation_status, "failed")
    raise
  end
end
