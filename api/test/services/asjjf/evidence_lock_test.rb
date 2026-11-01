require "test_helper"
require "timeout"

class AsjjfEvidenceLockTest < ActiveSupport::TestCase
  # Separate committed connections are essential to exercise the actual locks.
  self.use_transactional_tests = false

  test "snapshot writers serialize behind evaluation and parsed evidence cannot change mid-apply" do
    source_id = 987654321
    acquired = Queue.new
    finished = Queue.new
    thread = nil
    Asjjf::EvidenceLock.synchronize([ source_id ]) do
      thread = Thread.new do
        ActiveRecord::Base.connection_pool.with_connection do |connection|
          connection.transaction do
            key = connection.quote("asjjf-results-evidence:#{source_id}")
            acquired << connection.select_value("SELECT pg_try_advisory_xact_lock(hashtextextended(#{key}, 0))")
          end
          page = AsjjfSnapshot.create!(asjjf_id: source_id, url: "https://asjjf.org/main/eventResults/#{source_id}", page_type: "event_results", source: "admin_upload", outcome: "challenged", html: "challenge", parse_status: "skipped", fetched_at: Time.current)
          finished << page.id
        end
      end
      assert_equal false, Timeout.timeout(5) { acquired.pop }
      assert finished.empty?, "Snapshot writer must not commit while evaluation holds the source lock"
    end
    id = Timeout.timeout(10) { finished.pop }
    assert_equal "challenged", AsjjfSnapshot.find(id).outcome
    thread.join
  ensure
    thread&.join(10)
    AsjjfSnapshot.where(asjjf_id: source_id).destroy_all
  end

  test "new fetch planning participates in source serialization" do
    source_id = 987654322
    org = Organization.create!(name: "B3 lock fixture", slug: "b3-lock-fixture")
    event = org.events.create!(name: "B3 lock fixture", slug: "b3-lock-fixture", asjjf_event_ids: [ source_id ])
    started, finished = Queue.new, Queue.new
    thread = nil
    Asjjf::EvidenceLock.synchronize([ source_id ]) do
      thread = Thread.new do
        ActiveRecord::Base.connection_pool.with_connection do |connection|
          connection.transaction do
            key = connection.quote("asjjf-results-evidence:#{source_id}")
            started << connection.select_value("SELECT pg_try_advisory_xact_lock(hashtextextended(#{key}, 0))")
          end
          finished << Asjjf::FetchPlanner.new.plan_event_results(Event.find(event.id)).size
        end
      end
      assert_equal false, Timeout.timeout(5) { started.pop }
      assert finished.empty?
      assert_not AsjjfFetchRequest.where("url LIKE ?", "%/#{source_id}%").exists?
    end
    assert_equal 5, Timeout.timeout(10) { finished.pop }
    thread.join
  ensure
    thread&.join(10)
    AsjjfFetchRequest.where("url LIKE ?", "%/#{source_id}%").destroy_all
    event&.destroy!
    org&.destroy!
  end
end
