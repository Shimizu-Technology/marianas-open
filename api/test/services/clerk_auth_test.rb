require "test_helper"

class ClerkAuthTest < ActiveSupport::TestCase
  setup do
    reset_jwks
    @url = ENV["CLERK_JWKS_URL"]
    ENV["CLERK_JWKS_URL"] = "https://clerk.example.test/.well-known/jwks.json"
    @issuer = ENV.delete("CLERK_ISSUER")
    @audience = ENV.delete("CLERK_AUDIENCE")
    @get = HTTParty.method(:get)
    @old_key = JWT::JWK.new(OpenSSL::PKey::RSA.generate(2048), "old-key")
    @new_key = JWT::JWK.new(OpenSSL::PKey::RSA.generate(2048), "new-key")
    @calls = []
    keys = [ @old_key.export, @new_key.export ]
    calls = @calls
    response_class = Struct.new(:parsed_response) { def success? = true }
    HTTParty.define_singleton_method(:get) do |url, **_options, &block|
      calls << url
      block.call({ "keys" => [ keys.fetch([ calls.size - 1, 1 ].min) ] }.to_json)
      response_class.new(nil)
    end
  end

  teardown do
    HTTParty.define_singleton_method(:get, @get)
    reset_jwks
    ENV["CLERK_JWKS_URL"] = @url
    ENV["CLERK_ISSUER"] = @issuer
    ENV["CLERK_AUDIENCE"] = @audience
  end

  def reset_jwks
    ClerkAuth::JWKS_SNAPSHOT.set(nil)
    ClerkAuth.instance_variable_set(:@jwks_failure_until, nil)
    ClerkAuth.instance_variable_set(:@jwks_unknown_until, nil)
    ClerkAuth.instance_variable_set(:@jwks_refreshing, false)
  end

  def token(key)
    JWT.encode({ sub: "clerk_user", iat: Time.current.to_i, exp: 5.minutes.from_now.to_i }, key.signing_key, "RS256", kid: key.kid)
  end

  test "unknown kid refreshes immediately after an ordinary successful fetch" do
    assert_equal "clerk_user", ClerkAuth.verify(token(@old_key))["sub"]
    assert_equal "clerk_user", ClerkAuth.verify(token(@new_key))["sub"]
    assert_equal 2, @calls.size
    assert_equal "clerk_user", ClerkAuth.verify(token(@new_key))["sub"]
    assert_equal 2, @calls.size
  end

  test "unknown key refresh is limited and retries after cooldown" do
    unknown = JWT::JWK.new(OpenSSL::PKey::RSA.generate(2048), "unknown")
    3.times { assert_nil ClerkAuth.verify(token(unknown)) }
    assert_equal 2, @calls.size
    travel 11.seconds do
      assert_nil ClerkAuth.verify(token(unknown))
      assert_equal 3, @calls.size
    end
  end
  test "empty cache outage fails closed and throttles repeated failures" do
    calls = @calls
    HTTParty.define_singleton_method(:get) do |url, **options|
      calls << url
      raise "missing short timeouts" unless options == { open_timeout: 1, read_timeout: 2, stream_body: true }
      raise Timeout::Error, "JWKS unavailable"
    end
    3.times { assert_nil ClerkAuth.verify(token(@old_key)) }
    assert_equal 1, @calls.size
    travel 61.seconds do
      3.times { assert_nil ClerkAuth.verify(token(@old_key)) }
      assert_equal 2, @calls.size
    end
  end

  test "recovers from empty cache failure after cooldown" do
    calls = @calls
    jwks = { "keys" => [ @old_key.export ] }
    response_class = Struct.new(:parsed_response) { def success? = true }
    HTTParty.define_singleton_method(:get) do |url, **_options, &block|
      calls << url
      raise SocketError, "DNS unavailable" if calls.size == 1
      block.call(jwks.to_json)
      response_class.new(nil)
    end
    assert_nil ClerkAuth.verify(token(@old_key))
    assert_nil ClerkAuth.verify(token(@old_key))
    assert_equal 1, @calls.size
    travel 61.seconds do
      assert_equal "clerk_user", ClerkAuth.verify(token(@old_key))["sub"]
      assert_equal 2, @calls.size
    end
  end

  test "concurrent empty cache failures make one HTTP request" do
    calls = @calls
    HTTParty.define_singleton_method(:get) do |url, **_options|
      calls << url
      sleep 0.02
      raise Timeout::Error
    end
    signed = token(@old_key)
    results = Array.new(8) { Thread.new { ClerkAuth.verify(signed) } }.map(&:value)
    assert results.all?(&:nil?)
    assert_equal 1, @calls.size
  end

  test "concurrent unknown keys refresh cached JWKS only once" do
    ClerkAuth::JWKS_SNAPSHOT.set({ jwks: JSON.parse({ "keys" => [ @new_key.export ] }.to_json, freeze: true), expires_at: 1.hour.from_now }.freeze)
    signed = token(@old_key)
    results = Array.new(8) { Thread.new { ClerkAuth.verify(signed) } }.map(&:value)
    assert results.all? { |result| result && result["sub"] == "clerk_user" }
    assert_equal 1, @calls.size
  end
  test "known kid verification completes while an unknown kid refresh is slow" do
    assert ClerkAuth.verify(token(@old_key))
    entered = Queue.new
    release = Queue.new
    body = { "keys" => [ @old_key.export, @new_key.export ] }.to_json
    HTTParty.define_singleton_method(:get) do |*_args, **_options, &block|
      entered << true
      release.pop
      block.call(body)
      Struct.new(:success?).new(true)
    end
    new_token = token(@new_key)
    old_token = token(@old_key)
    refreshing = Thread.new { ClerkAuth.verify(new_token) }
    Timeout.timeout(2) { entered.pop }
    known = Thread.new { ClerkAuth.verify(old_token) }
    assert known.join(0.25), "known key was blocked behind HTTP refresh"
    assert_equal "clerk_user", known.value["sub"]
  ensure
    release << true if release
    refreshing&.join
    known&.join
  end

  test "waiters fail closed within the wait bound while refresh is in flight" do
    entered = Queue.new
    release = Queue.new
    body = { "keys" => [ @old_key.export ] }.to_json
    HTTParty.define_singleton_method(:get) do |*_args, **_options, &block|
      entered << true
      release.pop
      block.call(body)
      Struct.new(:success?).new(true)
    end
    signed = token(@old_key)
    refreshing = Thread.new { ClerkAuth.verify(signed) }
    Timeout.timeout(2) { entered.pop }
    waiter = Thread.new { ClerkAuth.verify(signed) }
    assert waiter.join(1), "waiter exceeded the refresh wait bound"
    assert_nil waiter.value
    assert refreshing.alive?, "refresh must still be in flight"
  ensure
    release << true if release
    refreshing&.join
    waiter&.join
  end

  test "overall deadline interrupts a slow trickle response and permits later recovery" do
    calls = @calls
    body = { "keys" => [ @old_key.export ] }.to_json
    HTTParty.define_singleton_method(:get) do |url, **_options, &block|
      calls << url
      if calls.size == 1
        loop do
          block.call(" ")
          sleep 0.05
        end
      end
      block.call(body)
      Struct.new(:success?).new(true)
    end
    started = Process.clock_gettime(Process::CLOCK_MONOTONIC)
    assert_nil ClerkAuth.verify(token(@old_key))
    elapsed = Process.clock_gettime(Process::CLOCK_MONOTONIC) - started
    assert_operator elapsed, :<, ClerkAuth::JWKS_FETCH_TIMEOUT + 1
    assert_nil ClerkAuth.verify(token(@old_key))
    assert_equal 1, @calls.size
    travel 61.seconds do
      assert ClerkAuth.verify(token(@old_key))
    end
  end

  test "oversized JWKS is rejected during streaming and backed off" do
    calls = @calls
    HTTParty.define_singleton_method(:get) do |url, **_options, &block|
      calls << url
      block.call(" " * ClerkAuth::JWKS_MAX_BYTES)
      block.call(" ")
      raise "must stop reading at the size cap"
    end
    2.times { assert_nil ClerkAuth.verify(token(@old_key)) }
    assert_equal 1, @calls.size
    assert_nil ClerkAuth::JWKS_SNAPSHOT.get
  end

  test "JWKS snapshot and nested key material are frozen" do
    assert ClerkAuth.verify(token(@old_key))
    snapshot = ClerkAuth::JWKS_SNAPSHOT.get
    assert snapshot.frozen?
    assert snapshot[:jwks].frozen?
    assert snapshot[:jwks]["keys"].frozen?
    assert snapshot[:jwks]["keys"].first.frozen?
  end
end
