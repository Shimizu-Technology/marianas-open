class ApplicationController < ActionController::API
  rescue_from StandardError do |e|
    Rails.logger.error("UNHANDLED ERROR: #{e.class}: #{e.message}")
    Rails.logger.error(e.backtrace&.first(10)&.join("\n"))
    render json: {
      error: e.message,
      type: e.class.name,
      trace: e.backtrace&.first(5)
    }, status: :internal_server_error
  end
end
