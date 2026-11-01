# No DSN means no client, background thread, or network transport.
if ENV["SENTRY_DSN"].present?
  Sentry.init do |config|
    config.dsn = ENV["SENTRY_DSN"]
    config.environment = Rails.env
    config.release = ENV["RENDER_GIT_COMMIT"].presence
    config.send_default_pii = false
    config.traces_sample_rate = Float(ENV.fetch("SENTRY_TRACES_SAMPLE_RATE", "0.01")).clamp(0.0, 1.0)
    # sentry-rails filters request data using Rails' config.filter_parameters.
    # Capture retry failures as well as terminal ActiveJob/Solid Queue exceptions.
    config.rails.active_job_report_on_retry_error = true
    # Job arguments can contain contact information and tokens.
    config.data_collection.queues = false
  end
end
