require "stringio"

# Bound input before Rails logging/authentication can trigger parameter parsing.
class AsjjfBodyLimit
  MAX_BYTES = 2 * 1024 * 1024 + 64 * 1024
  PREFIX = "/api/v1/internal/asjjf"

  def initialize(app)
    @app = app
  end

  def call(env)
    path = env["PATH_INFO"].to_s
    return @app.call(env) unless path == PREFIX || path.start_with?("#{PREFIX}/")
    return too_large if env["CONTENT_LENGTH"].to_i > MAX_BYTES

    input = env["rack.input"]
    body = +"".b
    while input && body.bytesize <= MAX_BYTES
      chunk = input.read(MAX_BYTES + 1 - body.bytesize)
      break if chunk.nil? || chunk.empty?
      body << chunk
    end
    return too_large if body.bytesize > MAX_BYTES

    # Keep the original bytes (including whitespace and encoding) for HMAC.
    env["rack.input"] = StringIO.new(body)
    @app.call(env)
  end

  private

  def too_large
    [ 413, { "content-type" => "application/json" }, [ '{"error":"Request body too large"}' ] ]
  end
end
