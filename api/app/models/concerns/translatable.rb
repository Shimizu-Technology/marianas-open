module Translatable
  extend ActiveSupport::Concern

  included do
    after_commit :enqueue_translation, on: [:create, :update], if: :any_translatable_fields_changed?
  end

  class_methods do
    def translatable_fields(*fields)
      @_translatable_fields = fields.map(&:to_s)
    end

    def translatable_field_names
      @_translatable_fields || []
    end

    # Declare JSONB array fields with their translatable sub-keys.
    # Example: translatable_json_fields(
    #   { field: :travel_items, sub_fields: [:title, :description] },
    #   { field: :visa_items, sub_fields: [:title, :description] }
    # )
    def translatable_json_fields(*configs)
      @_translatable_json_fields = configs.map do |c|
        result = { field: c[:field].to_s, sub_fields: c[:sub_fields].map(&:to_s) }
        if c[:nested]
          result[:nested] = c[:nested].transform_keys(&:to_s).transform_values { |v| v.map(&:to_s) }
        end
        result
      end
    end

    def translatable_json_field_names
      @_translatable_json_fields || []
    end

    def translation_context(ctx = nil)
      if ctx
        @_translation_context = ctx
      else
        @_translation_context
      end
    end
  end

  def translatable_field_values
    self.class.translatable_field_names.each_with_object({}) do |field, hash|
      val = send(field)
      hash[field] = val if val.present?
    end
  end

  def retranslate!
    update_column(:translation_status, "pending")
    TranslateRecordJob.perform_later(self.class.name, id)
  end

  private

  def any_translatable_fields_changed?
    text_changed = self.class.translatable_field_names.any? { |f| saved_change_to_attribute?(f) }
    json_changed = self.class.translatable_json_field_names.any? { |c| saved_change_to_attribute?(c[:field]) }
    text_changed || json_changed
  end

  def enqueue_translation
    service = GtTranslationService.new
    return unless service.configured?

    update_column(:translation_status, "pending")
    TranslateRecordJob.perform_later(self.class.name, id)
  end
end
