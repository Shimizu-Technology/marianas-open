module Asjjf
  class SnapshotIntake
    class LeaseError < StandardError; end

    def self.call(url:, html:, page_type: nil, fetcher_id: nil, request_id: nil, lease_token: nil, source: "fetcher", uploaded_by_user: nil,
      final_url: nil, http_status: 200, fetched_at: Time.current, outcome: "ok", error: nil)
      raise ArgumentError, "Invalid outcome" unless %w[ok challenged error].include?(outcome)
      raise ArgumentError, "HTML must be a string" unless html.is_a?(String) || (html.nil? && outcome != "ok")
      raise ArgumentError, "HTML exceeds 2 MB" if html && html.bytesize > AsjjfSnapshot::MAX_BYTES
      timestamp = fetched_at.is_a?(String) ? Time.iso8601(fetched_at) : fetched_at
      raise ArgumentError, "Invalid fetched_at" unless timestamp.is_a?(Time) || timestamp.is_a?(ActiveSupport::TimeWithZone)
      raise ArgumentError, "Invalid HTTP status" unless (http_status.is_a?(Integer) && http_status.between?(100, 599)) || (http_status.nil? && outcome != "ok")
      Url.parse(final_url) if final_url.present?
      notify = false
      snapshot = nil
      AsjjfSetting.breaker.with_lock do
        fetch_request = AsjjfFetchRequest.find(request_id) if source == "fetcher"
        if fetch_request && (fetch_request.status != "leased" || fetch_request.leased_by != fetcher_id ||
            fetch_request.lease_expires_at.nil? || fetch_request.lease_expires_at <= Time.current || fetch_request.url != url ||
            !lease_token.is_a?(String) || fetch_request.lease_token.blank? ||
            !ActiveSupport::SecurityUtils.secure_compare(fetch_request.lease_token, lease_token))
          raise LeaseError, "Request must have an unexpired lease owned by this fetcher with matching URL and lease token"
        end
        page_type = fetch_request.page_type if fetch_request
        uri = Url.parse(url, page_type: page_type)
        outcome = "challenged" if Parsers::ChallengeDetector.challenged?(html.to_s) || http_status == 403
        outcome = "error" if outcome == "ok" && http_status != 200
        if outcome == "ok" && source == "fetcher" && final_url.blank?
          raise ArgumentError, "Successful fetcher snapshots require a final URL"
        end
        if outcome == "ok" && final_url.present?
          final_uri = Url.parse(final_url, page_type: page_type)
          keys = page_type == "results_list" ? %w[gender age] : (page_type == "team_ranking" ? %w[rankType] : [])
          requested_params = URI.decode_www_form(uri.query.to_s).to_h
          final_params = URI.decode_www_form(final_uri.query.to_s).to_h
          same_params = keys.all? do |key|
            default = key == "rankType" ? "adult" : ""
            requested_params.fetch(key, default).casecmp?(final_params.fetch(key, default))
          end
          unless uri.path.delete_suffix("/") == final_uri.path.delete_suffix("/") && same_params
            raise ArgumentError, "Final URL does not match requested ASJJF page identity"
          end
        end
        snapshot = AsjjfSnapshot.create!(url: url, final_url: final_url, page_type: page_type,
          asjjf_id: uri.path.split("/").last.to_i, params: URI.decode_www_form(uri.query.to_s).to_h,
          http_status: http_status, outcome: outcome, fetched_at: timestamp, fetcher_id: fetcher_id,
          source: source, uploaded_by_user: uploaded_by_user, html: html,
          parse_status: outcome == "ok" ? "pending" : "skipped", parse_error: error.to_s.truncate(2000).presence)
        if outcome == "challenged"
          breaker = AsjjfSetting.breaker
          notify = !breaker.open?
          hours = ENV.fetch("ASJJF_BREAKER_HOURS", "12").to_i.clamp(1, 168)
          breaker.update!(paused_until: [ breaker.paused_until || Time.current, hours.hours.from_now ].max,
            reason: "Challenge on snapshot #{snapshot.id}", alerted_at: notify ? Time.current : breaker.alerted_at)
        end
        if fetch_request
          status = case outcome
          when "ok" then "done"
          when "challenged" then "blocked"
          else fetch_request.attempts >= AsjjfFetchRequest::MAX_ATTEMPTS ? "failed" : "pending"
          end
          fetch_request.update!(status: status, snapshot: snapshot, completed_at: status == "done" ? Time.current : nil,
            leased_by: nil, lease_expires_at: nil, lease_token: nil, last_error: outcome == "ok" ? nil : (error.presence || outcome).to_s.truncate(2000))
        end
      end
      ChallengeAlert.deliver(snapshot) if notify
      # Run the isolated parsing job after committing intake, so parser errors never undo a saved page.
      ParseAsjjfSnapshotJob.perform_now(snapshot.id) if snapshot.parse_status == "pending"
      snapshot.reload
    end
  end
end
