class ApplicationController < ActionController::API
  private

  def pagination_page
    params.fetch(:page, 1).to_i.clamp(1, 1_000_000)
  end

  def pagination_limit(key = :per_page, default: 50, maximum: 200)
    params.fetch(key, default).to_i.clamp(1, maximum)
  end
end
