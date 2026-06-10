default_local_origins = %w[
  http://localhost:5173
  http://127.0.0.1:5173
  http://localhost:4173
  http://127.0.0.1:4173
].join(",")

Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins ENV.fetch("ALLOWED_ORIGINS", default_local_origins).split(",").map(&:strip)
    resource "*",
      headers: :any,
      methods: [:get, :post, :put, :patch, :delete, :options, :head],
      expose: ["Authorization"],
      credentials: true
  end
end
