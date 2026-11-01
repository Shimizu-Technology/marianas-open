require "test_helper"

class AsjjfFetchRequestTest < ActiveSupport::TestCase
  test "dedupes active URLs and permits new requests after completion" do
    first = enqueue
    assert_equal first.id, enqueue.id
    AsjjfFetchRequest.lease!(fetcher_id: "a")
    assert_equal first.id, enqueue.id
    assert_empty AsjjfFetchRequest.lease!(fetcher_id: "b")
    first.update!(status: "done")
    assert_not_equal first.id, enqueue.id
  end

  test "leases priority first with bounded limits and expires abandoned work" do
    low = enqueue
    high = enqueue(url: "https://asjjf.org/main/eventInfo/2", priority: 10)
    assert_equal [ high.id ], AsjjfFetchRequest.lease!(fetcher_id: "a", limit: 1).map(&:id)
    first_token = high.reload.lease_token
    high.update!(lease_expires_at: 1.second.ago)
    assert_equal [ high.id ], AsjjfFetchRequest.lease!(fetcher_id: "b", limit: 1).map(&:id)
    assert_equal 2, high.reload.attempts
    assert_not_equal first_token, high.lease_token
    assert_match(/\A[0-9a-f]{64}\z/, high.lease_token)
    high.update!(lease_expires_at: 1.second.ago, attempts: 5)
    assert_equal [ low.id ], AsjjfFetchRequest.lease!(fetcher_id: "c").map(&:id)
    assert_equal "failed", high.reload.status
    assert_nil high.lease_token
  end

  test "validates enqueue hosts, protocols, credentials, and page paths" do
    %w[http://asjjf.org/main/eventInfo/1 https://asjjf.org.evil.com/main/eventInfo/1 https://user@asjjf.org/main/eventInfo/1 https://asjjf.org:444/main/eventInfo/1 https://localhost/main/eventInfo/1 https://asjjf.org/main/eventInfo/1#fragment https://asjjf.org/main/eventResults/1].each do |url|
      assert_raises(ArgumentError, url) { enqueue(url: url) }
    end
    assert enqueue(url: "https://dumau.asjjf.org/main/eventInfo/1").persisted?
  end

  test "database unique partial index prevents duplicate active work" do
    item = enqueue
    assert_raises(ActiveRecord::RecordNotUnique) do
      AsjjfFetchRequest.transaction(requires_new: true) do
        AsjjfFetchRequest.insert_all!([ { url: item.url, page_type: item.page_type, status: "pending" } ])
      end
    end
  end

  private

  def enqueue(url: "https://asjjf.org/main/eventInfo/1", priority: 0)
    AsjjfFetchRequest.enqueue!(url: url, page_type: "event_info", priority: priority)
  end
end
