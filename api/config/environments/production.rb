require "active_support/core_ext/integer/time"

Rails.application.configure do
  # Settings specified here will take precedence over those in config/application.rb.

  # Code is not reloaded between requests.
  config.enable_reloading = false

  # Eager load code on boot for better performance and memory savings (ignored by Rake tasks).
  config.eager_load = true

  # Full error reports are disabled.
  config.consider_all_requests_local = false

  # Cache assets for far-future expiry since they are all digest stamped.
  config.public_file_server.headers = { "cache-control" => "public, max-age=#{1.year.to_i}" }

  # Enable serving of images, stylesheets, and JavaScripts from an asset server.
  # config.asset_host = "http://assets.example.com"

  # Assume all access to the app is happening through a SSL-terminating reverse proxy.
  config.assume_ssl = ActiveModel::Type::Boolean.new.cast(ENV.fetch("ASSUME_SSL", "true"))

  # Force all access to the app over SSL, while allowing Render/Kamal-style
  # health checks to stay simple. Set FORCE_SSL=false only for platforms that
  # cannot support Rails' SSL middleware behind their proxy.
  config.force_ssl = ActiveModel::Type::Boolean.new.cast(ENV.fetch("FORCE_SSL", "true"))
  config.ssl_options = { redirect: { exclude: ->(request) { request.path == "/health" } } }

  # Log to STDOUT with the current request id as a default log tag.
  config.log_tags = [ :request_id ]
  config.logger   = ActiveSupport::TaggedLogging.logger(STDOUT)

  # Change to "debug" to log everything (including potentially personally-identifiable information!).
  config.log_level = ENV.fetch("RAILS_LOG_LEVEL", "info")

  # Prevent health checks from clogging up the logs.
  config.silence_healthcheck_path = "/health"

  # Don't log any deprecations.
  config.active_support.report_deprecations = false

  # Replace the default in-process memory cache store with a durable alternative.
  config.cache_store = :memory_store

  # Enable locale fallbacks for I18n (makes lookups for any locale fall back to
  # the I18n.default_locale when a translation cannot be found).
  config.i18n.fallbacks = true

  # Do not dump schema after migrations.
  config.active_record.dump_schema_after_migration = false

  # Only use :id for inspections in production.
  config.active_record.attributes_for_inspect = [ :id ]

  # Enable DNS rebinding protection and other `Host` header attacks when the
  # deployment provides ALLOWED_HOSTS (comma-separated hostnames). This remains
  # opt-in to avoid breaking existing deployments that have not set the variable,
  # but logs loudly so operators know host authorization is inactive.
  allowed_hosts = ENV.fetch("ALLOWED_HOSTS", "").split(",").map(&:strip).reject(&:blank?)
  if allowed_hosts.any?
    config.hosts.concat(allowed_hosts)
    config.host_authorization = { exclude: ->(request) { request.path == "/health" } }
  else
    config.after_initialize do
      Rails.logger.warn(
        "ALLOWED_HOSTS is not set; Rails host authorization is inactive in production. " \
          "Set ALLOWED_HOSTS to a comma-separated list of API hostnames to enable DNS rebinding protection."
      )
    end
  end

  # Active Storage
  config.active_storage.service = :amazon

  # Keep image processing, mail, and other background work out of the Puma
  # request process. Render should run a separate worker with `bundle exec bin/jobs`.
  config.active_job.queue_adapter = :solid_queue
end
