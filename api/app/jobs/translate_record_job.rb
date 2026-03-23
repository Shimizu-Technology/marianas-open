class TranslateRecordJob < ApplicationJob
  queue_as :default

  discard_on ActiveJob::DeserializationError

  def perform(class_name, record_id)
    klass = class_name.safe_constantize
    return unless klass&.include?(Translatable)

    record = klass.find_by(id: record_id)
    return unless record

    service = GtTranslationService.new
    unless service.configured?
      Rails.logger.warn("[TranslateRecordJob] GT API not configured, skipping #{class_name}##{record_id}")
      return
    end

    fields = record.translatable_field_values
    if fields.empty?
      record.update_column(:translation_status, "translated")
      return
    end

    translations = service.translate_fields(fields, context: klass.translation_context)

    merged = record.translations.deep_dup
    translations.each do |field, locales|
      merged[field] ||= {}
      locales.each { |locale, text| merged[field][locale] = text }
    end

    record.update_columns(translations: merged, translation_status: "translated")
    Rails.logger.info("[TranslateRecordJob] Translated #{class_name}##{record_id}: #{fields.keys.join(', ')}")

    translate_children(record) if record.respond_to?(:translate_children, true)
  rescue GtTranslationService::TranslationError => e
    Rails.logger.error("[TranslateRecordJob] Failed #{class_name}##{record_id}: #{e.message}")
    record&.update_column(:translation_status, "failed")
  end

  private

  def translate_children(record)
    if record.is_a?(Event)
      record.event_schedule_items.find_each { |item| item.retranslate! }
      record.prize_categories.find_each { |cat| cat.retranslate! }
      record.event_accommodations.find_each { |acc| acc.retranslate! }
    end
  end
end
