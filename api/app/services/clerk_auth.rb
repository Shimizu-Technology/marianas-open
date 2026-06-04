class ClerkAuth
  JWKS_CACHE_KEY = "clerk_jwks"
  JWKS_CACHE_TTL = 1.hour

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

      jwks = fetch_jwks
      return nil if jwks.nil?

      decode_options = {
        algorithms: [ "RS256" ],
        jwks: jwks,
        verify_iat: true,
        leeway: 30
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

    def fetch_jwks
      cached = Rails.cache.read(JWKS_CACHE_KEY)
      return cached if cached.present?

      jwks_uri = jwks_url
      return nil unless jwks_uri

      response = HTTParty.get(jwks_uri, timeout: 5)

      if response.success?
        jwks = response.parsed_response
        Rails.cache.write(JWKS_CACHE_KEY, jwks, expires_in: JWKS_CACHE_TTL)
        jwks
      else
        Rails.logger.error("Failed to fetch Clerk JWKS: #{response.code}")
        nil
      end
    rescue HTTParty::Error, Timeout::Error => e
      Rails.logger.error("Error fetching Clerk JWKS: #{e.message}")
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
