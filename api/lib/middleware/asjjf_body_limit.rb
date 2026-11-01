require "stringio"

# Bound input before Rails logging/authentication can trigger parameter parsing.
class AsjjfBodyLimit
  MAX_BYTES = 2 * 1024 * 1024 + 64 * 1024
  PREFIX = "/api/v1/internal/asjjf"

  def initialize(app)
    @app = app
  end

  def call(env)
    return @app.call(env) unless internal_asjjf_path?(env["PATH_INFO"].to_s)
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

  # Scope by the same canonical path the Rails router matches on (repeated or
  # trailing slashes collapsed, percent-encoding decoded), so variants such as
  # "/api//v1/internal/asjjf/snapshots" cannot skip the limit. The original
  # PATH_INFO is left untouched because the HMAC signs the path as sent.
  def internal_asjjf_path?(raw_path)
    decoded = Rack::Utils.unescape_path(raw_path)
    path = ActionDispatch::Journey::Router::Utils.normalize_path(decoded)
    path == PREFIX || path.start_with?("#{PREFIX}/")
  rescue ArgumentError
    # Malformed encodings are treated as in scope so they are bounded too.
    true
  end

  def too_large
    [ 413, { "content-type" => "application/json" }, [ '{"error":"Request body too large"}' ] ]
  end
end
