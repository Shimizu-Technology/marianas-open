require "timeout"

class ClerkAuth
  JWKS_CACHE_TTL = 1.hour
  JWKS_FAILURE_BACKOFF = 1.minute
  JWKS_UNKNOWN_KID_INTERVAL = 10.seconds
  JWKS_FETCH_TIMEOUT = 4
  JWKS_WAIT_TIMEOUT = 0.5
  JWKS_MAX_BYTES = 256 * 1024
  JWKS_SNAPSHOT = Concurrent::AtomicReference.new
  JWKS_REFRESH_LOCK = Mutex.new
  JWKS_REFRESH_DONE = ConditionVariable.new
  EMPTY_JWKS = { "keys" => [].freeze }.freeze
  ResponseTooLarge = Class.new(StandardError)
  TOKEN_CLOCK_SKEW_LEEWAY_SECONDS = 30

  class << self
    def verify(token)
      return nil if token.blank?

      # Test tokens for test environment
      if Rails.env.test? && token.start_with?("test_token_")
        return handle_test_token(token)
      end

      # Dev tokens for development only — explicitly blocked in production
      if token.start_with?("dev_token_")
        return nil unless Rails.env.development?
        return handle_dev_token(token)
      end

      # This leeway is clock-skew tolerance for all JWT time claims, including
      # exp/nbf/iat. Tokens that expired within this small window are accepted
      # so legitimate users are not rejected when server/client clocks differ.
      refresh_wait_deadline = Process.clock_gettime(Process::CLOCK_MONOTONIC) + JWKS_WAIT_TIMEOUT
      decode_options = {
        algorithms: [ "RS256" ],
        jwks: ->(options) { load_jwks(options, deadline: refresh_wait_deadline) },
        verify_iat: true,
        leeway: TOKEN_CLOCK_SKEW_LEEWAY_SECONDS
      }
      if expected_issuer.present?
        decode_options[:iss] = expected_issuer
        decode_options[:verify_iss] = true
      end
      if expected_audience.present?
        decode_options[:aud] = expected_audience
        decode_options[:verify_aud] = true
      end

      decoded = JWT.decode(token, nil, true, decode_options)

      decoded.first
    rescue JWT::DecodeError => e
      Rails.logger.warn("JWT decode error: #{e.message}")
      nil
    rescue JWT::ExpiredSignature
      Rails.logger.debug("JWT token expired")
      nil
    end

    private

    def load_jwks(options, deadline:)
      # An immutable, atomically swapped snapshot keeps known keys off the
      # refresh lock entirely, including while another thread is doing HTTP.
      cached = cached_jwks
      return cached if cached && !options[:kid_not_found]

      refresh_jwks(options, deadline: deadline)
    end

    def cached_jwks
      snapshot = JWKS_SNAPSHOT.get
      snapshot[:jwks] if snapshot && snapshot[:expires_at] > Time.current
    end

    def refresh_jwks(options, deadline:)
      JWKS_REFRESH_LOCK.synchronize do
        while @jwks_refreshing
          remaining = deadline - Process.clock_gettime(Process::CLOCK_MONOTONIC)
          return EMPTY_JWKS if remaining <= 0

          JWKS_REFRESH_DONE.wait(JWKS_REFRESH_LOCK, remaining)
        end

        cached = cached_jwks
        # A completed concurrent refresh may already contain the requested key.
        return cached if cached && (!options[:kid_not_found] || cached["keys"].any? { |key| key["kid"] == options[:kid] })
        return cached || EMPTY_JWKS if @jwks_failure_until && @jwks_failure_until > Time.current
        if options[:kid_not_found]
          return cached || EMPTY_JWKS if @jwks_unknown_until && @jwks_unknown_until > Time.current

          @jwks_unknown_until = JWKS_UNKNOWN_KID_INTERVAL.from_now
        end
        @jwks_refreshing = true
      end

      begin
        jwks = fetch_jwks
        JWKS_REFRESH_LOCK.synchronize do
          if jwks
            JWKS_SNAPSHOT.set({ jwks: jwks, expires_at: JWKS_CACHE_TTL.from_now }.freeze)
            @jwks_failure_until = nil
          else
            @jwks_failure_until = JWKS_FAILURE_BACKOFF.from_now
          end
        end
        jwks || cached_jwks || EMPTY_JWKS
      ensure
        JWKS_REFRESH_LOCK.synchronize do
          @jwks_refreshing = false
          JWKS_REFRESH_DONE.broadcast
        end
      end
    end

    def fetch_jwks
      jwks_uri = jwks_url
      return nil unless jwks_uri

      Timeout.timeout(JWKS_FETCH_TIMEOUT) do
        body = +""
        response = HTTParty.get(jwks_uri, open_timeout: 1, read_timeout: 2, stream_body: true) do |fragment|
          raise ResponseTooLarge if body.bytesize + fragment.bytesize > JWKS_MAX_BYTES

          body << fragment
        end
        unless response.success?
          Rails.logger.error("Failed to fetch Clerk JWKS: #{response.code}")
          return nil
        end

        jwks = JSON.parse(body, freeze: true)
        return nil unless jwks.is_a?(Hash) && jwks["keys"].is_a?(Array) && jwks["keys"].all? { |key| key.is_a?(Hash) }

        jwks
      end
    rescue HTTParty::Error, Timeout::Error, SocketError, SystemCallError, IOError, OpenSSL::SSL::SSLError, JSON::ParserError, ResponseTooLarge => e
      Rails.logger.error("Error fetching Clerk JWKS: #{e.class}")
      nil
    end

    def jwks_url
      jwks = ENV.fetch("CLERK_JWKS_URL", nil)
      return jwks if jwks.present?

      Rails.logger.warn("CLERK_JWKS_URL not configured")
      nil
    end

    def expected_issuer
      ENV.fetch("CLERK_ISSUER", nil).presence
    end

    def expected_audience
      raw = ENV.fetch("CLERK_AUDIENCE", nil).presence
      return nil unless raw

      values = raw.split(",").map(&:strip).reject(&:blank?)
      values.one? ? values.first : values
    end

    def handle_test_token(token)
      user_id = token.gsub("test_token_", "")
      user = User.find_by(id: user_id)

      if user
        {
          "sub" => user.clerk_id || "test_clerk_#{user.id}",
          "email" => user.email,
          "first_name" => user.first_name,
          "last_name" => user.last_name
        }
      end
    end

    def handle_dev_token(token)
      email = token.gsub("dev_token_", "")
      user = User.find_by("LOWER(email) = ?", email.downcase)

      if user
        {
          "sub" => user.clerk_id || "dev_clerk_#{user.id}",
          "email" => user.email,
          "first_name" => user.first_name,
          "last_name" => user.last_name
        }
      end
    end
  end
end
