require "test_helper"
require "stringio"

class AsjjfBodyLimitTest < ActiveSupport::TestCase
  class TrackedInput < StringIO
    attr_reader :bytes_read, :read_sizes

    def initialize(body)
      super(body)
      @bytes_read = 0
      @read_sizes = []
    end

    def read(size)
      @read_sizes << size
      super.tap { |chunk| @bytes_read += chunk.to_s.bytesize }
    end
  end

  test "oversized declared length is rejected by the Rails stack without reading input" do
    input = TrackedInput.new("{")
    env = Rack::MockRequest.env_for("/api/v1/internal/asjjf/snapshots", method: "POST")
    env.merge!("rack.input" => input, "CONTENT_TYPE" => "application/json", "CONTENT_LENGTH" => (AsjjfBodyLimit::MAX_BYTES + 1).to_s)
    status, = Rails.application.call(env)
    assert_equal 413, status
    assert_empty input.read_sizes
  end

  test "unknown or chunked length reads at most limit plus one before rejecting malformed unauthenticated JSON" do
    [ nil, "" ].each do |length|
      input = TrackedInput.new("{" + "x" * (AsjjfBodyLimit::MAX_BYTES * 2))
      env = Rack::MockRequest.env_for("/api/v1/internal/asjjf/snapshots", method: "POST")
      env.merge!("rack.input" => input, "CONTENT_TYPE" => "application/json", "CONTENT_LENGTH" => length, "HTTP_TRANSFER_ENCODING" => "chunked")
      status, = Rails.application.call(env)
      assert_equal 413, status
      assert_equal AsjjfBodyLimit::MAX_BYTES + 1, input.bytes_read
    end
  end

  test "dishonest small declared length cannot bypass the streaming cap" do
    input = TrackedInput.new("x" * (AsjjfBodyLimit::MAX_BYTES + 2))
    status, = AsjjfBodyLimit.new(->(_) { flunk "Oversized input reached downstream parsing" }).call(
      "PATH_INFO" => "/api/v1/internal/asjjf/heartbeat", "CONTENT_LENGTH" => "1", "rack.input" => input)
    assert_equal 413, status
    assert_equal AsjjfBodyLimit::MAX_BYTES + 1, input.bytes_read
  end

  test "accepted input is replaced with a rewindable stream with exact original bytes" do
    bytes = "{ \"html\": \"日本語\" }\n".b
    input = TrackedInput.new(bytes)
    app = ->(env) do
      assert_equal bytes, env["rack.input"].read
      env["rack.input"].rewind
      assert_equal bytes, env["rack.input"].read
      [ 204, {}, [] ]
    end
    status, = AsjjfBodyLimit.new(app).call("PATH_INFO" => "/api/v1/internal/asjjf/snapshots", "rack.input" => input)
    assert_equal 204, status
  end

  test "other routes are untouched including a similar prefix" do
    [ "/api/v1/admin/asjjf/snapshots", "/api/v1/internal/asjjf-other" ].each do |path|
      input = TrackedInput.new("body")
      AsjjfBodyLimit.new(->(env) { assert_same input, env["rack.input"] }).call(
        "PATH_INFO" => path, "CONTENT_LENGTH" => (AsjjfBodyLimit::MAX_BYTES + 1).to_s, "rack.input" => input)
      assert_empty input.read_sizes
    end
  end

  test "router-normalized and encoded path variants are bounded before any body read" do
    [
      "/api//v1/internal/asjjf/snapshots",
      "//api/v1/internal/asjjf/snapshots",
      "/api/v1//internal//asjjf/snapshots/",
      "/api/v1/internal/%61sjjf/snapshots",
      "/api/v1/internal/asjjf%2Fsnapshots"
    ].each do |path|
      input = TrackedInput.new("{")
      env = Rack::MockRequest.env_for("http://example.com", method: "POST")
      env.merge!("PATH_INFO" => path, "rack.input" => input, "CONTENT_TYPE" => "application/json",
                 "CONTENT_LENGTH" => (AsjjfBodyLimit::MAX_BYTES + 1).to_s)
      status, = Rails.application.call(env)
      assert_equal 413, status, "expected #{path} to be bounded"
      assert_empty input.read_sizes, "expected #{path} not to be read"

      chunked = TrackedInput.new("{" + "x" * (AsjjfBodyLimit::MAX_BYTES * 2))
      env = Rack::MockRequest.env_for("http://example.com", method: "POST")
      env.merge!("PATH_INFO" => path, "rack.input" => chunked, "CONTENT_TYPE" => "application/json",
                 "HTTP_TRANSFER_ENCODING" => "chunked")
      status, = Rails.application.call(env)
      assert_equal 413, status, "expected chunked #{path} to be bounded"
      assert_equal AsjjfBodyLimit::MAX_BYTES + 1, chunked.bytes_read
    end
  end

  test "routes outside the internal ASJJF API are untouched by the limit" do
    seen = []
    app = ->(env) { seen << env["PATH_INFO"]; [ 204, {}, [] ] }
    [ "/api/v1/admin/asjjf/status", "/api/v1/internal/asjjf-other/x", "/api/v1/events" ].each do |path|
      status, = AsjjfBodyLimit.new(app).call("PATH_INFO" => path, "CONTENT_LENGTH" => (AsjjfBodyLimit::MAX_BYTES + 1).to_s, "rack.input" => StringIO.new(""))
      assert_equal 204, status
    end
    assert_equal 3, seen.size
  end
end
