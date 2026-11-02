class CheckVideoAvailabilityJob < ApplicationJob
  queue_as :default

  def perform(video_id)
    # One database-wide lock covers nightly and admin-triggered checks, even
    # across worker processes. Always wait a second before the next request,
    # including after a rolled-back check or a URL change.
    Video.transaction do
      Video.connection.execute("SELECT pg_advisory_xact_lock(2027, 6)")
      video = Video.lock.find_by(id: video_id)
      return unless video

      sleep(1)
      status = YoutubeAvailability.check(video.youtube_video_id)
      failures = %w[removed restricted].include?(status) ? video.consecutive_failures + 1 : 0
      hidden = status == "available" ? false : video.availability_hidden || failures >= 2
      video.update!(availability_status: status, availability_checked_at: Time.current,
                    consecutive_failures: failures, availability_hidden: hidden)
    end
  end
end
