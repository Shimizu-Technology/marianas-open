require "test_helper"
require_relative "../support/video_http_stubs"

class CheckVideoAvailabilityJobTest < ActiveSupport::TestCase
  include VideoHttpStubs
  setup do
    @video = Video.create!(title: "Match", youtube_url: "https://youtu.be/sI5C5FpI0wQ", status: "published")
  end

  def check(status)
    replace_method(YoutubeAvailability, :check, ->(*) { status }) { CheckVideoAvailabilityJob.perform_now(@video.id) }
    @video.reload
  end

  test "two definite failures hide and available automatically restores" do
    check("removed")
    assert_equal 1, @video.consecutive_failures
    assert_not @video.availability_hidden
    check("restricted")
    assert @video.availability_hidden
    assert_equal 2, @video.consecutive_failures
    check("unknown")
    assert @video.availability_hidden
    check("available")
    assert_not @video.availability_hidden
    assert_equal 0, @video.consecutive_failures
    assert_equal "published", @video.status
    assert @video.availability_checked_at
  end

  test "unknown breaks a failure streak without hiding and drafts stay drafts" do
    check("removed")
    check("unknown")
    check("removed")
    assert_not @video.availability_hidden
    assert_equal 1, @video.consecutive_failures
    @video.update!(status: "draft")
    check("available")
    assert_equal "draft", @video.status
  end

  test "changing the URL clears old availability and old extracted ID" do
    check("removed")
    check("removed")
    @video.update!(youtube_url: "invalid")
    assert_not @video.availability_hidden
    assert_nil @video.youtube_video_id
    assert_equal "unknown", @video.availability_status
    assert_equal 0, @video.consecutive_failures
    assert_nil @video.availability_checked_at
  end

  test "checks are spaced by at least one second" do
    starts = []
    replace_method(YoutubeAvailability, :check, ->(*) { starts << Process.clock_gettime(Process::CLOCK_MONOTONIC); "available" }) do
      2.times { CheckVideoAvailabilityJob.perform_now(@video.id) }
    end
    assert_operator starts.last - starts.first, :>=, 1
  end

  test "nightly checks every video including hidden and draft videos" do
    @video.update!(availability_hidden: true, status: "draft")
    ids = []
    replace_method(CheckVideoAvailabilityJob, :perform_now, ->(id) { ids << id }) { CheckAllVideoAvailabilityJob.perform_now }
    assert_includes ids, @video.id
  end
end
