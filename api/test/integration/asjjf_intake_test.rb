require "test_helper"
require "openssl"
require "digest"

class AsjjfIntakeTest < ActionDispatch::IntegrationTest
  setup do
    @old_secret = ENV["ASJJF_FETCHER_SECRET"]
    ENV["ASJJF_FETCHER_SECRET"] = "b1-test-secret"
    @url = "https://asjjf.org/main/eventResults/2062"
    @fetch_request = AsjjfFetchRequest.enqueue!(url: @url, page_type: "event_results")
  end

  teardown do
    ENV["ASJJF_FETCHER_SECRET"] = @old_secret
  end

  test "HMAC signs exact query and raw bytes; limits are bounded" do
    signed(:get, "/api/v1/internal/asjjf/work?limit=100")
    assert_response :success
    assert_equal @fetch_request.id, response.parsed_body["requests"].first["id"]
    assert_equal @fetch_request.reload.lease_token, response.parsed_body["requests"].first["lease_token"]
    assert_match(/\A[0-9a-f]{64}\z/, response.parsed_body["requests"].first["lease_token"])
    assert_equal 90, response.parsed_body["pacing_seconds"]
    assert_nil response.parsed_body["paused_until"]
    assert_equal "leased", @fetch_request.reload.status
    assert_in_delta 45.minutes.from_now, @fetch_request.lease_expires_at, 2
  end

  test "bad signature, skew, missing headers, tampered query, and missing secret fail closed" do
    path = "/api/v1/internal/asjjf/work"
    get path, headers: auth_headers(:get, path).merge("X-Asjjf-Signature" => "0" * 64)
    assert_response :unauthorized
    get path, headers: auth_headers(:get, path, timestamp: 301.seconds.ago.to_i)
    assert_response :unauthorized
    get path, headers: auth_headers(:get, path, timestamp: 301.seconds.from_now.to_i)
    assert_response :unauthorized
    get path
    assert_response :unauthorized
    get "#{path}?limit=2", headers: auth_headers(:get, "#{path}?limit=1")
    assert_response :unauthorized
    ENV.delete("ASJJF_FETCHER_SECRET")
    get path
    assert_response :not_found
    post "/api/v1/internal/asjjf/snapshots", params: "{}", headers: { "CONTENT_TYPE" => "application/json" }
    assert_response :not_found
    post "/api/v1/internal/asjjf/heartbeat", params: "{}", headers: { "CONTENT_TYPE" => "application/json" }
    assert_response :not_found
  end

  test "signed raw body cannot be changed and oversized bodies are rejected" do
    path = "/api/v1/internal/asjjf/heartbeat"
    post path, params: '{"changed":true}', headers: auth_headers(:post, path, body: "{}").merge("CONTENT_TYPE" => "application/json")
    assert_response :unauthorized
    signed(:post, path, body: "x" * (AsjjfBodyLimit::MAX_BYTES + 1))
    assert_response :content_too_large
  end

  test "rate limit is persisted by shared credential regardless of fetcher label" do
    AsjjfFetcherRateLimit.create!(credential_digest: Digest::SHA256.hexdigest(ENV.fetch("ASJJF_FETCHER_SECRET")), window_started_at: Time.current, request_count: 60)
    signed(:get, "/api/v1/internal/asjjf/work")
    assert_response :too_many_requests
    assert_equal "60", response.headers["Retry-After"]
    signed(:get, "/api/v1/internal/asjjf/work", fetcher: "other")
    assert_response :too_many_requests
  end

  test "successful snapshot is compressed and parsed without applying results" do
    lease
    before_counts = [ EventResult.count, Competitor.count, Academy.count ]
    signed(:post, "/api/v1/internal/asjjf/snapshots", body: payload.merge(elapsed_ms: 1234).to_json)
    assert_response :created
    assert_equal "parsed", response.parsed_body["parse_status"]
    snapshot = AsjjfSnapshot.find(response.parsed_body["snapshot_id"])
    assert_equal 1234, snapshot.parsed_summary.dig("fetch_metadata", "elapsed_ms")
    assert_equal fixture_html, snapshot.html
    assert_equal Digest::SHA256.hexdigest(fixture_html), snapshot.sha256
    assert_operator snapshot.compressed_html.bytesize, :<, snapshot.byte_size
    assert_equal "fetcher", snapshot.source
    assert_equal 2062, snapshot.asjjf_id
    assert_equal "done", @fetch_request.reload.status
    assert_equal before_counts, [ EventResult.count, Competitor.count, Academy.count ]
  end

  test "safe fetch error categories and elapsed time are stored unchanged" do
    %w[navigation_timeout net_ERR_CONNECTION_RESET disallowed_redirect disallowed_method boundary_violation browser_launch_failed aborted_deadline unknown].each do |category|
      @fetch_request.update!(status: "pending", attempts: 0)
      lease
      signed(:post, "/api/v1/internal/asjjf/snapshots", body: payload.merge(
        outcome: "error", error: category, elapsed_ms: 60_012, final_url: nil, http_status: nil, html: nil).to_json)
      assert_response :created
      snapshot = AsjjfSnapshot.find(response.parsed_body["snapshot_id"])
      assert_equal category, snapshot.parse_error
      assert_equal 60_012, snapshot.parsed_summary.dig("fetch_metadata", "elapsed_ms")
      assert_equal category, @fetch_request.reload.last_error
    end
  end

  test "invalid elapsed time is rejected without consuming the lease" do
    lease
    [ -1, 86_400_001, "60000", 1.5 ].each do |elapsed|
      signed(:post, "/api/v1/internal/asjjf/snapshots", body: payload.merge(elapsed_ms: elapsed).to_json)
      assert_response :unprocessable_entity
      assert_equal "leased", @fetch_request.reload.status
    end
  end

  test "server detects a challenge claimed as ok and pauses leasing with one alert per episode" do
    lease
    alerts = []
    original = Asjjf::ChallengeAlert.method(:deliver)
    Asjjf::ChallengeAlert.define_singleton_method(:deliver) { |snapshot| alerts << snapshot.id }
    2.times do |index|
      if index.positive?
        @fetch_request = AsjjfFetchRequest.enqueue!(url: "https://asjjf.org/main/eventResults/2063", page_type: "event_results")
        @fetch_request.update!(status: "leased", leased_by: "home", lease_token: SecureRandom.hex(32), attempts: 1, lease_expires_at: 10.minutes.from_now)
      end
      signed(:post, "/api/v1/internal/asjjf/snapshots", body: payload.merge(url: @fetch_request.url, html: File.read(Rails.root.join("test/fixtures/files/asjjf/cloudflare_challenge.html"))).to_json)
      assert_response :created
      assert_equal "skipped", response.parsed_body["parse_status"]
      assert_equal "blocked", @fetch_request.reload.status
    end
    assert_equal 1, alerts.size
    assert_in_delta 12.hours.from_now, AsjjfSetting.breaker.paused_until, 3
    signed(:get, "/api/v1/internal/asjjf/work")
    assert_response :success
    assert_empty response.parsed_body["requests"]
    assert response.parsed_body["paused_until"]
  ensure
    Asjjf::ChallengeAlert.define_singleton_method(:deliver, original) if original
  end

  test "wrong fetcher, URL, or expired lease cannot submit" do
    lease
    signed(:post, "/api/v1/internal/asjjf/snapshots", body: payload.to_json, fetcher: "other")
    assert_response :conflict
    signed(:post, "/api/v1/internal/asjjf/snapshots", body: payload.merge(url: "https://asjjf.org/main/eventResults/2063").to_json)
    assert_response :conflict
    @fetch_request.update!(lease_expires_at: 1.second.ago)
    signed(:post, "/api/v1/internal/asjjf/snapshots", body: payload.to_json)
    assert_response :conflict
    assert_equal 0, AsjjfSnapshot.count
  end

  test "fetch failures retry up to maximum and parser failures stay recorded" do
    lease
    signed(:post, "/api/v1/internal/asjjf/snapshots", body: payload.merge(http_status: 500, outcome: "error", html: "", error: "Unavailable").to_json)
    assert_response :created
    assert_equal "pending", @fetch_request.reload.status
    @fetch_request.update!(attempts: 4)
    lease
    signed(:post, "/api/v1/internal/asjjf/snapshots", body: payload.merge(outcome: "error", html: "").to_json)
    assert_response :created
    assert_equal "failed", @fetch_request.reload.status
    other = AsjjfFetchRequest.enqueue!(url: @url, page_type: "event_results")
    @fetch_request = other
    lease
    signed(:post, "/api/v1/internal/asjjf/snapshots", body: payload.merge(html: "<html><title>Unrelated</title></html>").to_json)
    assert_response :created
    assert_equal "failed", response.parsed_body["parse_status"]
    assert AsjjfSnapshot.last.parse_error.present?
  end

  test "successful fetcher submission requires a final URL" do
    lease
    [ nil, "" ].each do |final_url|
      signed(:post, "/api/v1/internal/asjjf/snapshots", body: payload.merge(final_url: final_url).to_json)
      assert_response :unprocessable_entity
      assert_equal "leased", @fetch_request.reload.status
      assert_equal 0, AsjjfSnapshot.count
    end
  end

  test "redirects cannot change page identity or result category" do
    lease
    signed(:post, "/api/v1/internal/asjjf/snapshots", body: payload.merge(final_url: "https://asjjf.org/main/eventResults/2063").to_json)
    assert_response :unprocessable_entity
    assert_equal 0, AsjjfSnapshot.count
    assert_equal "leased", @fetch_request.reload.status
    signed(:post, "/api/v1/internal/asjjf/snapshots", body: payload.merge(final_url: "https://dumau.asjjf.org/main/eventResults/2062/").to_json)
    assert_response :created
    assert_equal "parsed", response.parsed_body["parse_status"]
    @url = "https://asjjf.org/main/resultsList/2062?gender=FEMALE&age=ADULT"
    @fetch_request = AsjjfFetchRequest.enqueue!(url: @url, page_type: "results_list")
    lease
    signed(:post, "/api/v1/internal/asjjf/snapshots", body: payload.merge(final_url: @url.sub("FEMALE", "MALE")).to_json)
    assert_response :unprocessable_entity
  end

  test "network error with no HTTP response is stored and retried" do
    lease
    signed(:post, "/api/v1/internal/asjjf/snapshots", body: payload.merge(final_url: nil, http_status: nil, outcome: "error", error: "Network timeout", html: "").to_json)
    assert_response :created
    assert_equal "skipped", response.parsed_body["parse_status"]
    assert_nil AsjjfSnapshot.last.http_status
    assert_equal "pending", @fetch_request.reload.status
  end

  test "heartbeat stores latest values and rejects invalid counters" do
    body = { fetcher_version: "1.0", run_started_at: Time.current.iso8601, run_finished_at: nil, fetched: 2, challenged: 0, errors: 1 }
    signed(:post, "/api/v1/internal/asjjf/heartbeat", body: body.to_json)
    assert_response :no_content
    heartbeat = AsjjfFetcherHeartbeat.find_by!(fetcher_id: "home")
    assert_equal 2, heartbeat.fetched
    assert heartbeat.received_at
    signed(:post, "/api/v1/internal/asjjf/heartbeat", body: body.merge(fetched: -1).to_json)
    assert_response :unprocessable_entity
    assert_equal 2, heartbeat.reload.fetched
  end

  test "published signing vectors agree with the fetcher" do
    vectors = [
      [ "GET", "/api/v1/internal/asjjf/work?limit=1", "", "21bc697d9810c337c4777bde2328ea6dfa2e82a4656a99688a8cd0b9d36c0848" ],
      [ "POST", "/api/v1/internal/asjjf/heartbeat", '{"fetcher_version":"1.0.0","run_finished_at":null}', "3cb94907bb4f7fd6c75ddffcf2dc41d4fe260080624ff28d0a5ec431527820e8" ]
    ]
    vectors.each do |method, path, body, signature|
      message = "1793577600\n#{method}\n#{path}\n#{Digest::SHA256.hexdigest(body)}"
      assert_equal signature, OpenSSL::HMAC.hexdigest("SHA256", "test-secret", message)
    end
  end

  test "HMAC covers exact raw JSON after middleware buffers unknown length input" do
    path = "/api/v1/internal/asjjf/heartbeat"
    body = " { \"fetcher_version\": \"日本語\", \"run_started_at\": \"#{Time.current.iso8601}\", \"run_finished_at\": null, \"fetched\": 0, \"challenged\": 0, \"errors\": 0 }\n"
    env = Rack::MockRequest.env_for(path, method: "POST")
    env.merge!("rack.input" => StringIO.new(body), "CONTENT_TYPE" => "application/json", "CONTENT_LENGTH" => nil)
    auth_headers(:post, path, body: body).each { |key, value| env["HTTP_#{key.upcase.tr('-', '_')}"] = value }
    status, = Rails.application.call(env)
    assert_equal 204, status
    assert_equal "日本語", AsjjfFetcherHeartbeat.find_by!(fetcher_id: "home").fetcher_version
  end

  test "replaying an error snapshot after re-leasing cannot consume the new lease" do
    lease
    body = payload.merge(final_url: nil, http_status: nil, html: nil, outcome: "error", error: "fetch_failed").to_json
    path = "/api/v1/internal/asjjf/snapshots"
    headers = auth_headers(:post, path, body: body).merge("CONTENT_TYPE" => "application/json")
    old_token = @fetch_request.reload.lease_token
    post path, params: body, headers: headers
    assert_response :created
    lease
    current_token = @fetch_request.reload.lease_token
    assert_not_equal old_token, current_token
    assert_match(/\A[0-9a-f]{64}\z/, current_token)
    post path, params: body, headers: headers
    assert_response :conflict
    assert_equal 1, AsjjfSnapshot.count
    assert_equal "leased", @fetch_request.reload.status
    assert_equal current_token, @fetch_request.lease_token
    signed(:post, path, body: payload.merge(lease_token: "bad").to_json)
    assert_response :conflict
    signed(:post, path, body: payload.merge(lease_token: nil).to_json)
    assert_response :conflict
    signed(:post, path, body: payload.to_json)
    assert_response :created
    assert_equal "done", @fetch_request.reload.status
    assert_nil @fetch_request.lease_token
  end

  # These result objects match fetcher/src/run.js and browser.js failure outputs
  # exercised by fetcher/test/{run,browser}.test.js, with the leased envelope added.
  {
    "network failure" => { final_url: nil, http_status: nil, outcome: "error", error: "fetch_failed", html: nil },
    "oversized page" => { final_url: "https://asjjf.org/main/eventResults/2062", http_status: 200, outcome: "error", error: "too_large", html: nil },
    "latched challenge without a response" => { final_url: nil, http_status: nil, outcome: "challenged", error: "challenge_detected", html: nil },
    "latched challenge after rejected redirect" => { final_url: nil, http_status: 403, outcome: "challenged", error: "challenge_detected", html: nil },
    "oversized challenged page" => { final_url: "https://asjjf.org/main/eventResults/2062", http_status: 200, outcome: "challenged", error: "too_large", html: nil }
  }.each do |name, result|
    test "fetcher contract accepts #{name}" do
      lease
      alerts = []
      original = Asjjf::ChallengeAlert.method(:deliver)
      Asjjf::ChallengeAlert.define_singleton_method(:deliver) { |snapshot| alerts << snapshot.id }
      signed(:post, "/api/v1/internal/asjjf/snapshots", body: payload.merge(result).to_json)
      assert_response :created
      snapshot = AsjjfSnapshot.find(response.parsed_body["snapshot_id"])
      assert_equal "skipped", snapshot.parse_status
      assert_equal result[:outcome], snapshot.outcome
      assert_equal result[:error], snapshot.parse_error
      assert_equal "", snapshot.html
      challenged = result[:outcome] == "challenged"
      assert_equal challenged, AsjjfSetting.breaker.open?
      assert_equal challenged ? [ snapshot.id ] : [], alerts
      assert_equal challenged ? "blocked" : "pending", @fetch_request.reload.status
      assert_nil @fetch_request.lease_token
      unless challenged
        @fetch_request.update!(attempts: AsjjfFetchRequest::MAX_ATTEMPTS - 1)
        lease
        signed(:post, "/api/v1/internal/asjjf/snapshots", body: payload.merge(result).to_json)
        assert_response :created
        assert_equal "failed", @fetch_request.reload.status
      end
    ensure
      Asjjf::ChallengeAlert.define_singleton_method(:deliver, original) if original
    end
  end

  test "successful snapshots still reject null HTML or status" do
    lease
    [ { html: nil }, { http_status: nil } ].each do |fields|
      signed(:post, "/api/v1/internal/asjjf/snapshots", body: payload.merge(fields).to_json)
      assert_response :unprocessable_entity
      assert_equal "leased", @fetch_request.reload.status
      assert_equal 0, AsjjfSnapshot.count
    end
  end

  private

  def fixture_html
    File.read(Rails.root.join("test/fixtures/files/asjjf/event_results_2062_gi.html"))
  end

  def payload
    { request_id: @fetch_request.id, lease_token: @fetch_request.reload.lease_token, url: @url, final_url: @url, http_status: 200, fetched_at: Time.current.iso8601, outcome: "ok", error: nil, html: fixture_html }
  end

  def lease
    AsjjfFetchRequest.lease!(fetcher_id: "home")
  end

  def signed(method, path, body: "", fetcher: "home")
    public_send(method, path, params: body.presence, headers: auth_headers(method, path, body: body, fetcher: fetcher).merge("CONTENT_TYPE" => "application/json"))
  end

  def auth_headers(method, path, body: "", timestamp: Time.current.to_i, fetcher: "home")
    message = "#{timestamp}\n#{method.to_s.upcase}\n#{path}\n#{Digest::SHA256.hexdigest(body)}"
    { "X-Asjjf-Fetcher-Id" => fetcher, "X-Asjjf-Timestamp" => timestamp.to_s,
      "X-Asjjf-Signature" => OpenSSL::HMAC.hexdigest("SHA256", ENV.fetch("ASJJF_FETCHER_SECRET"), message) }
  end
end
