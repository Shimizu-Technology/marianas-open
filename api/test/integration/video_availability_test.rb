require "test_helper"

class VideoAvailabilityTest < ActionDispatch::IntegrationTest
  include ActiveJob::TestHelper

  setup do
    @video = Video.create!(title: "Visible", youtube_url: "https://youtu.be/sI5C5FpI0wQ", status: "published")
    @hidden = Video.create!(title: "Hidden", youtube_url: "https://youtu.be/8Iyqjj3LkR0", status: "published", availability_hidden: true)
    # URL initialization resets old availability; simulate completed checks.
    @hidden.update!(availability_hidden: true)
    @staff = User.create!(email: "video-staff@example.com", clerk_id: "video_staff", role: "staff")
    @headers = { "Authorization" => "Bearer test_token_#{@staff.id}" }
  end

  test "public list and detail exclude hidden and draft videos" do
    draft = Video.create!(title: "Draft", youtube_url: @video.youtube_url, status: "draft")
    get "/api/v1/videos"
    assert_response :success
    assert_includes response.parsed_body.pluck("id"), @video.id
    assert_not_includes response.parsed_body.pluck("id"), @hidden.id
    assert_not_includes response.parsed_body.pluck("id"), draft.id
    get "/api/v1/videos/#{@hidden.id}"
    assert_response :not_found
    get "/api/v1/videos/#{@video.id}"
    assert_response :success
  end

  test "visible videos expose event dates for cross-year filter ordering" do
    org = Organization.create!(name: "Video events", slug: "video-events")
    event = org.events.create!(name: "Tokyo 2026", slug: "tokyo-video", date: Date.new(2026, 2, 20), status: "completed")
    @video.update!(event: event)
    get "/api/v1/videos"
    record = response.parsed_body.find { |row| row["id"] == @video.id }
    assert_equal "Tokyo 2026", record["event_name"]
    assert_equal "2026-02-20", record["event_date"]
  end

  test "checks require staff and enqueue rather than block on YouTube" do
    post "/api/v1/admin/videos/#{@video.id}/check_availability"
    assert_response :unauthorized
    user = User.create!(email: "video-user@example.com", clerk_id: "video_user", role: "viewer")
    post "/api/v1/admin/videos/#{@video.id}/check_availability", headers: { "Authorization" => "Bearer test_token_#{user.id}" }
    assert_response :forbidden
    assert_enqueued_with(job: CheckVideoAvailabilityJob, args: [ @video.id ]) do
      post "/api/v1/admin/videos/#{@video.id}/check_availability", headers: @headers
      assert_response :accepted
    end
  end

  test "admin filter retains hidden records and saves enqueue checks" do
    get "/api/v1/admin/videos", params: { unavailable: "true" }, headers: @headers
    assert_response :success
    assert_equal [ @hidden.id ], response.parsed_body["videos"].pluck("id")
    assert_enqueued_with(job: CheckVideoAvailabilityJob, args: [ @video.id ]) do
      patch "/api/v1/admin/videos/#{@video.id}", params: { title: "Updated" }, headers: @headers, as: :json
      assert_response :success
    end
    assert_enqueued_jobs 1, only: CheckVideoAvailabilityJob do
      post "/api/v1/admin/videos", params: { title: "New", youtube_url: @video.youtube_url }, headers: @headers, as: :json
      assert_response :created
    end
  end
end
