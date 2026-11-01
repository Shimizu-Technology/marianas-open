require "test_helper"
require "stringio"

class SentryIntegrationTest < ActiveSupport::TestCase
  class FailingJob < ActiveJob::Base
    def perform
      raise "monitoring fixture failure"
    end
  end

  setup do
    @original_logger = Rails.logger
    @original_dsn = ENV["SENTRY_DSN"]
    @original_rate = ENV["SENTRY_TRACES_SAMPLE_RATE"]
    @originally_initialized = Sentry.initialized?
    Sentry.close if Sentry.initialized?
  end

  teardown do
    Sentry.close if Sentry.initialized?
    Rails.logger = @original_logger
    ENV["SENTRY_DSN"] = @original_dsn
    ENV["SENTRY_TRACES_SAMPLE_RATE"] = @original_rate
    load Rails.root.join("config/initializers/sentry.rb") if @originally_initialized
  end

  test "monitoring is disabled without a DSN" do
    original_dsn = ENV["SENTRY_DSN"]
    ENV.delete("SENTRY_DSN")
    Sentry.close if Sentry.initialized?
    load Rails.root.join("config/initializers/sentry.rb")
    assert_not Sentry.initialized?
  ensure
    ENV["SENTRY_DSN"] = original_dsn
  end

  {
    nil => [ 0.01, false ],
    "" => [ 0.01, true ],
    " " => [ 0.01, true ],
    "invalid" => [ 0.01, true ],
    "NaN" => [ 0.01, true ],
    "Infinity" => [ 0.01, true ],
    "1e999" => [ 0.01, true ],
    "-0.5" => [ 0.0, true ],
    "1.5" => [ 1.0, true ],
    "0" => [ 0.0, false ],
    "1" => [ 1.0, false ],
    "0.25" => [ 0.25, false ]
  }.each do |raw_rate, (expected, warned)|
    test "sample rate #{raw_rate.inspect} boots with a safe rate" do
      ENV["SENTRY_DSN"] = "https://public@example.com/1"
      ENV["SENTRY_TRACES_SAMPLE_RATE"] = raw_rate
      log = StringIO.new
      Rails.logger = ActiveSupport::Logger.new(log)
      load Rails.root.join("config/initializers/sentry.rb")
      assert Sentry.initialized?
      assert_equal expected, Sentry.configuration.traces_sample_rate
      assert_equal warned, log.string.include?("SENTRY_TRACES_SAMPLE_RATE")
    end
  end

  test "enabled monitoring captures ActiveJob failures without sending network requests" do
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
  end
end
