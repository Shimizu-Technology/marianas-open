require "test_helper"
require_relative "../support/video_http_stubs"

class YoutubeAvailabilityTest < ActiveSupport::TestCase
  include VideoHttpStubs
  test "classifies oEmbed responses and uses a fixed host with timeouts" do
    { 200 => "available", 404 => "removed", 401 => "restricted", 403 => "restricted", 429 => "unknown", 500 => "unknown" }.each do |code, expected|
      http = Object.new
      http.define_singleton_method(:max_retries=) { |value| raise unless value == 0 }
      http.define_singleton_method(:get) { |_path| Struct.new(:code).new(code.to_s) }
      request = ->(host, port, **options, &block) do
        assert_equal "www.youtube.com", host
        assert_equal 443, port
        assert_equal 5, options[:read_timeout]
        assert_equal 5, options[:open_timeout]
        block.call(http)
      end
      replace_method(Net::HTTP, :start, request) { assert_equal expected, YoutubeAvailability.check("sI5C5FpI0wQ") }
    end
  end

  test "network failures and invalid IDs are unknown" do
    replace_method(Net::HTTP, :start, ->(*) { raise Net::ReadTimeout }) do
      assert_equal "unknown", YoutubeAvailability.check("sI5C5FpI0wQ")
    end
    replace_method(Net::HTTP, :start, ->(*) { flunk "invalid ID must not make an HTTP request" }) do
      assert_equal "unknown", YoutubeAvailability.check("https://untrusted.example")
    end
  end
end
