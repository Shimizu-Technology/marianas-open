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

    merged = record.translations.deep_dup
    translated_keys = []

    # Translate simple text fields
    fields = record.translatable_field_values
    if fields.any?
      translations = service.translate_fields(fields, context: klass.translation_context)
      translations.each do |field, locales|
        merged[field] ||= {}
        locales.each { |locale, text| merged[field][locale] = text }
      end
      translated_keys.concat(fields.keys)
    end

    # Translate JSONB array fields (arrays of hashes with text values)
    if record.class.respond_to?(:translatable_json_field_names)
      record.class.translatable_json_field_names.each do |json_field_config|
        field_name = json_field_config[:field].to_s
        sub_fields = json_field_config[:sub_fields].map(&:to_s)
        items = record.send(field_name)
        next if items.blank? || !items.is_a?(Array)

        translated_items = translate_json_array(service, items, sub_fields, klass.translation_context)
        if translated_items
          merged[field_name] = translated_items
          translated_keys << field_name
        end
      end
    end

    if translated_keys.empty?
      record.update_column(:translation_status, "translated")
    else
      record.update_columns(translations: merged, translation_status: "translated")
      Rails.logger.info("[TranslateRecordJob] Translated #{class_name}##{record_id}: #{translated_keys.join(', ')}")
    end

    # Translate child records
    if record.is_a?(Event)
      record.event_schedule_items.find_each(&:retranslate!)
      record.prize_categories.find_each(&:retranslate!)
      record.event_accommodations.find_each(&:retranslate!)
    end
  rescue GtTranslationService::TranslationError => e
    Rails.logger.error("[TranslateRecordJob] Failed #{class_name}##{record_id}: #{e.message}")
    record&.update_column(:translation_status, "failed")
  end

  private

  # Translates an array of hashes, returning { locale => [translated_items] }
  def translate_json_array(service, items, sub_fields, context)
    all_texts = {}
    items.each_with_index do |item, idx|
      sub_fields.each do |sf|
        text = item[sf].presence || item[sf.to_sym].presence
        next unless text.is_a?(String) && text.present?
        all_texts["#{idx}.#{sf}"] = text
      end
    end
    return nil if all_texts.empty?

    translations = service.translate_fields(all_texts, context: context)

    result = {}
    GtTranslationService::TARGET_LOCALES.each do |locale|
      result[locale] = items.map.with_index do |item, idx|
        translated_item = item.is_a?(Hash) ? item.dup : item.to_h.dup
        sub_fields.each do |sf|
          key = "#{idx}.#{sf}"
          if translations.dig(key, locale)
            translated_item[sf] = translations[key][locale]
          end
        end
        translated_item
      end
    end
    result
  end
end
