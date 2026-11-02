require "net/http"

class YoutubeAvailability
  def self.check(video_id)
    return "unknown" unless video_id.to_s.match?(/\A[a-zA-Z0-9_-]{11}\z/)

    uri = URI("https://www.youtube.com/oembed")
    uri.query = URI.encode_www_form(url: "https://www.youtube.com/watch?v=#{video_id}", format: "json")
    response = Net::HTTP.start(uri.host, uri.port, use_ssl: true, open_timeout: 5, read_timeout: 5, write_timeout: 5) do |http|
      http.max_retries = 0
      http.get(uri.request_uri)
    end
    case response.code.to_i
    when 200 then "available"
    when 404 then "removed"
    when 401, 403 then "restricted"
    else "unknown"
    end
  rescue Timeout::Error, IOError, SystemCallError, SocketError, Net::ProtocolError, OpenSSL::SSL::SSLError
    "unknown"
  end
end
