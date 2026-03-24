module Translatable
  extend ActiveSupport::Concern

  included do
    before_save :track_translatable_changes
    after_commit :enqueue_translation, on: [:create, :update], if: :has_translatable_changes?
  end

  class_methods do
    def translatable_fields(*fields)
      @_translatable_fields = fields.map(&:to_s)
    end

    def translatable_field_names
      @_translatable_fields || []
    end

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
    TranslateRecordJob.perform_later(self.class.name, id, "changed_fields" => nil, "cascade" => true)
  end

  private

  def track_translatable_changes
    @_translatable_changes = []
    self.class.translatable_field_names.each do |f|
      @_translatable_changes << f if will_save_change_to_attribute?(f)
    end
    self.class.translatable_json_field_names.each do |c|
      @_translatable_changes << c[:field] if will_save_change_to_attribute?(c[:field])
    end
  end

  def has_translatable_changes?
    @_translatable_changes.present?
  end

  def enqueue_translation
    service = GtTranslationService.new
    return unless service.configured?

    changed = @_translatable_changes || []
    update_column(:translation_status, "pending")
    TranslateRecordJob.perform_later(self.class.name, id, "changed_fields" => changed, "cascade" => false)
  ensure
    @_translatable_changes = nil
  end
end
