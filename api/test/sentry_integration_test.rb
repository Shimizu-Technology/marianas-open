require "test_helper"

class SentryIntegrationTest < ActiveSupport::TestCase
  class FailingJob < ActiveJob::Base
    def perform
      raise "monitoring fixture failure"
    end
  end

  test "monitoring is disabled without a DSN" do
    assert_not Sentry.initialized? if ENV["SENTRY_DSN"].blank?
  end

  test "enabled monitoring captures ActiveJob failures without sending network requests" do
    original_dsn = ENV["SENTRY_DSN"]
    ENV["SENTRY_DSN"] = "https://public@example.com/1"
    load Rails.root.join("config/initializers/sentry.rb")
    # Replace transport before performing a job; Sentry sends asynchronously otherwise.
    Sentry.configuration.transport.transport_class = Sentry::DummyTransport
    Sentry.configuration.background_worker_threads = 0
    Sentry.get_current_hub.bind_client(Sentry::Client.new(Sentry.configuration))
    assert_raises(RuntimeError) { FailingJob.perform_now }
    events = Sentry.get_current_client.transport.events
    assert_equal 1, events.size
    assert_match(/monitoring fixture failure/, events.first.exception.values.first.value)
    assert_equal Rails.env.to_s, Sentry.configuration.environment
    assert_not Sentry.configuration.send_default_pii
    assert_not Sentry.configuration.data_collection.queues
  ensure
    Sentry.close
    ENV["SENTRY_DSN"] = original_dsn
  end
end
