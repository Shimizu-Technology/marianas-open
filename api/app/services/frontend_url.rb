class FrontendUrl
  class << self
    def origin
      configured = ENV["PUBLIC_FRONTEND_URL"].presence || ENV["FRONTEND_URL"].presence
      return configured.chomp("/") if configured.present?

      allowed = ENV.fetch("ALLOWED_ORIGINS", "http://localhost:5173")
      allowed.split(",").first.strip.chomp("/")
    end

    def admin
      "#{origin}/admin"
    end
  end
end
