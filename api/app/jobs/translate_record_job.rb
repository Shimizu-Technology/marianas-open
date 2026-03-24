class TranslateRecordJob < ApplicationJob
  queue_as :default

  discard_on ActiveJob::DeserializationError

  def perform(class_name, record_id, options = {})
    changed_fields = options["changed_fields"] # nil = translate all, array = only those
    cascade = options.fetch("cascade", false)

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

    text_fields = record.translatable_field_values
    if changed_fields
      text_fields = text_fields.select { |k, _| changed_fields.include?(k) }
    end

    if text_fields.any?
      translations = service.translate_fields(text_fields, context: klass.translation_context)
      translations.each do |field, locales|
        merged[field] ||= {}
        locales.each { |locale, text| merged[field][locale] = text }
      end
      translated_keys.concat(text_fields.keys)
    end

    json_configs = record.class.respond_to?(:translatable_json_field_names) ? record.class.translatable_json_field_names : []
    if changed_fields
      json_configs = json_configs.select { |c| changed_fields.include?(c[:field]) }
    end

    json_configs.each do |config|
      field_name = config[:field].to_s
      sub_fields = config[:sub_fields].map(&:to_s)
      nested = config[:nested] || {}
      items = record.send(field_name)
      next if items.blank? || !items.is_a?(Array)

      translated_items = translate_json_array(service, items, sub_fields, nested, klass.translation_context)
      if translated_items
        merged[field_name] = translated_items
        translated_keys << field_name
      end
    end

    if translated_keys.empty?
      record.update_column(:translation_status, "translated")
    else
      record.update_columns(translations: merged, translation_status: "translated")
      Rails.logger.info("[TranslateRecordJob] Translated #{class_name}##{record_id}: #{translated_keys.join(', ')}")
    end

    if cascade && record.is_a?(Event)
      record.event_schedule_items.where.not(translation_status: "pending").find_each(&:retranslate!)
      record.prize_categories.where.not(translation_status: "pending").find_each(&:retranslate!)
      record.event_accommodations.where.not(translation_status: "pending").find_each(&:retranslate!)
    end
  rescue GtTranslationService::TranslationError => e
    Rails.logger.error("[TranslateRecordJob] Failed #{class_name}##{record_id}: #{e.message}")
    record&.update_column(:translation_status, "failed")
  end

  private

  def translate_json_array(service, items, sub_fields, nested, context)
    all_texts = {}

    items.each_with_index do |item, idx|
      sub_fields.each do |sf|
        text = item[sf].presence || item[sf.to_sym].presence
        next unless text.is_a?(String) && text.present?
        all_texts["#{idx}.#{sf}"] = text
      end

      nested.each do |nested_key, nested_sub_fields|
        nested_arr = item[nested_key] || item[nested_key.to_sym]
        next unless nested_arr.is_a?(Array)

        nested_arr.each_with_index do |nested_item, nidx|
          nested_sub_fields.each do |nsf|
            text = nested_item[nsf].presence || nested_item[nsf.to_sym].presence
            next unless text.is_a?(String) && text.present?
            all_texts["#{idx}.#{nested_key}.#{nidx}.#{nsf}"] = text
          end
        end
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
          translated_item[sf] = translations[key][locale] if translations.dig(key, locale)
        end

        nested.each do |nested_key, nested_sub_fields|
          nested_arr = item[nested_key] || item[nested_key.to_sym]
          next unless nested_arr.is_a?(Array)

          translated_item[nested_key] = nested_arr.map.with_index do |nested_item, nidx|
            tn = nested_item.is_a?(Hash) ? nested_item.dup : nested_item.to_h.dup
            nested_sub_fields.each do |nsf|
              key = "#{idx}.#{nested_key}.#{nidx}.#{nsf}"
              tn[nsf] = translations[key][locale] if translations.dig(key, locale)
            end
            tn
          end
        end

        translated_item
      end
    end
    result
  end
end
