module Translatable
  extend ActiveSupport::Concern

  included do
    after_commit :enqueue_translation, on: [:create, :update], if: :translatable_fields_changed?
  end

  class_methods do
    def translatable_fields(*fields)
      @_translatable_fields = fields.map(&:to_s)
    end

    def translatable_field_names
      @_translatable_fields || []
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

  def translatable_fields_changed?
    return false if self.class.translatable_field_names.empty?
    self.class.translatable_field_names.any? { |f| saved_change_to_attribute?(f) }
  end

  def enqueue_translation
    service = GtTranslationService.new
    return unless service.configured?

    update_column(:translation_status, "pending")
    TranslateRecordJob.perform_later(self.class.name, id)
  end
end
