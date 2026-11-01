# No DSN means no client, background thread, or network transport.
if ENV["SENTRY_DSN"].present?
  raw_rate = ENV["SENTRY_TRACES_SAMPLE_RATE"]
  sample_rate = raw_rate.nil? ? 0.01 : Float(raw_rate, exception: false)
  if sample_rate.nil? || !sample_rate.finite?
    Rails.logger.warn("Invalid SENTRY_TRACES_SAMPLE_RATE; using default 0.01")
    sample_rate = 0.01
  elsif !sample_rate.between?(0.0, 1.0)
    Rails.logger.warn("SENTRY_TRACES_SAMPLE_RATE outside 0..1; clamping")
    sample_rate = sample_rate.clamp(0.0, 1.0)
  end

  Sentry.init do |config|
    config.dsn = ENV["SENTRY_DSN"]
    config.environment = Rails.env
    config.release = ENV["RENDER_GIT_COMMIT"].presence
    config.send_default_pii = false
    config.traces_sample_rate = sample_rate
    # sentry-rails filters request data using Rails' config.filter_parameters.
    # Capture retry failures as well as terminal ActiveJob/Solid Queue exceptions.
    config.rails.active_job_report_on_retry_error = true
    # Job arguments can contain contact information and tokens.
    config.data_collection.queues = false
  end
end
