require "test_helper"

class ClerkAuthTest < ActiveSupport::TestCase
  setup do
    @cache = Rails.cache
    Rails.cache = ActiveSupport::Cache::MemoryStore.new
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
    HTTParty.define_singleton_method(:get) do |url, **_options|
      calls << url
      response_class.new({ "keys" => [ keys.fetch([ calls.size - 1, 1 ].min) ] })
    end
  end

  teardown do
    HTTParty.define_singleton_method(:get, @get)
    Rails.cache = @cache
    ENV["CLERK_JWKS_URL"] = @url
    ENV["CLERK_ISSUER"] = @issuer
    ENV["CLERK_AUDIENCE"] = @audience
  end

  def token(key)
    JWT.encode({ sub: "clerk_user", iat: Time.current.to_i, exp: 5.minutes.from_now.to_i }, key.signing_key, "RS256", kid: key.kid)
  end

  test "unknown kid refreshes cached JWKS after rotation" do
    assert_equal "clerk_user", ClerkAuth.verify(token(@old_key))["sub"]
    travel 61.seconds
    assert_equal "clerk_user", ClerkAuth.verify(token(@new_key))["sub"]
    assert_equal 2, @calls.size
    assert_equal "clerk_user", ClerkAuth.verify(token(@new_key))["sub"]
    assert_equal 2, @calls.size
  end

  test "unknown key refresh is limited and retries after cooldown" do
    unknown = JWT::JWK.new(OpenSSL::PKey::RSA.generate(2048), "unknown")
    3.times { assert_nil ClerkAuth.verify(token(unknown)) }
    assert_equal 1, @calls.size
    travel 61.seconds do
      assert_nil ClerkAuth.verify(token(unknown))
      assert_equal 2, @calls.size
    end
  end
  test "empty cache outage fails closed and throttles repeated failures" do
    calls = @calls
    HTTParty.define_singleton_method(:get) do |url, **options|
      calls << url
      raise "missing short timeouts" unless options == { open_timeout: 2, read_timeout: 3 }
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
    HTTParty.define_singleton_method(:get) do |url, **_options|
      calls << url
      raise SocketError, "DNS unavailable" if calls.size == 1
      response_class.new(jwks)
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
    Rails.cache.write(ClerkAuth::JWKS_CACHE_KEY, { "keys" => [ @new_key.export ] })
    signed = token(@old_key)
    results = Array.new(8) { Thread.new { ClerkAuth.verify(signed) } }.map(&:value)
    assert results.all? { |result| result && result["sub"] == "clerk_user" }
    assert_equal 1, @calls.size
  end
end
