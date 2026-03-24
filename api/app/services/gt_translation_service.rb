class GtTranslationService
  BASE_URL = "https://runtime2.gtx.dev".freeze
  API_VERSION = "2026-03-06.v1".freeze
  TARGET_LOCALES = %w[ja ko zh tl pt].freeze

  class TranslationError < StandardError; end

  def initialize
    @api_key = ENV["GT_API_KEY"]
    @project_id = ENV["GT_PROJECT_ID"]
  end

  def configured?
    @api_key.present? && @project_id.present?
  end

  # Translate a hash of { field_name => english_text } into all target locales.
  # Returns { "field_name" => { "ja" => "...", "ko" => "...", ... }, ... }
  def translate_fields(fields, context: nil)
    raise TranslationError, "GT API not configured" unless configured?

    results = {}
    fields.each_key { |f| results[f] = {} }

    TARGET_LOCALES.each do |locale|
      requests = {}
      fields.each do |field_name, text|
        next if text.blank?
        entry = { "source" => text }
        entry["metadata"] = { "context" => context } if context
        requests[field_name] = entry
      end

      next if requests.empty?

      response = call_api(requests, locale)

      fields.each_key do |field_name|
        next if fields[field_name].blank?
        result = response[field_name]
        if result.is_a?(Hash) && result["translation"]
          results[field_name][locale] = result["translation"]
        end
      end
    end

    results
  end

  private

  def call_api(requests, target_locale)
    response = HTTParty.post(
      "#{BASE_URL}/v2/translate",
      headers: {
        "Content-Type" => "application/json",
        "x-gt-api-key" => @api_key,
        "x-gt-project-id" => @project_id,
        "gt-api-version" => API_VERSION
      },
      body: {
        requests: requests,
        targetLocale: target_locale,
        sourceLocale: "en",
        metadata: {}
      }.to_json,
      timeout: 15
    )

    unless response.success?
      raise TranslationError, "GT API returned #{response.code}: #{response.body}"
    end

    JSON.parse(response.body)
  rescue Net::OpenTimeout, Net::ReadTimeout => e
    raise TranslationError, "GT API timeout: #{e.message}"
  rescue JSON::ParserError => e
    raise TranslationError, "GT API returned invalid JSON: #{e.message}"
  end
end
