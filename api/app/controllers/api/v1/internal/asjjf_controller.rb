require "openssl"
require "digest"

module Api
  module V1
    module Internal
      class AsjjfController < ApplicationController
        before_action :authenticate_fetcher!
        rescue_from ArgumentError, TypeError, KeyError, ActiveRecord::RecordInvalid, with: :invalid_payload
        rescue_from ActiveRecord::RecordNotFound, with: :missing_record
        rescue_from Asjjf::SnapshotIntake::LeaseError, with: :invalid_lease

        def work
          limit = params[:limit].present? ? Integer(params[:limit], 10).clamp(1, 20) : 10
          requests = AsjjfFetchRequest.lease!(fetcher_id: @fetcher_id, limit: limit)
          breaker = AsjjfSetting.breaker
          render json: { requests: requests.map { |item| item.attributes.slice("id", "url", "page_type", "lease_expires_at", "lease_token") },
            pacing_seconds: 90, paused_until: breaker.open? ? breaker.paused_until : nil }
        end

        def snapshots
          data = JSON.parse(@raw_body)
          required = %w[request_id lease_token url final_url http_status fetched_at outcome html]
          raise ArgumentError, "Missing snapshot fields" unless data.is_a?(Hash) && required.all? { |key| data.key?(key) }
          snapshot = Asjjf::SnapshotIntake.call(**data.slice(*required, "error", "elapsed_ms").symbolize_keys, fetcher_id: @fetcher_id)
          render json: { snapshot_id: snapshot.id, parse_status: snapshot.parse_status }, status: :created
        rescue JSON::ParserError => e
          invalid_payload(e)
        end

        def heartbeat
          data = JSON.parse(@raw_body)
          raise ArgumentError, "Invalid heartbeat" unless data.is_a?(Hash) && data["fetcher_version"].is_a?(String) && data["fetcher_version"].length <= 100
          attributes = data.slice("fetcher_version")
          %w[run_started_at run_finished_at].each do |field|
            attributes[field] = data[field].nil? && field == "run_finished_at" ? nil : Time.iso8601(data.fetch(field))
          end
          %w[fetched challenged errors].each do |field|
            value = data.fetch(field)
            raise ArgumentError, "Invalid count" unless value.is_a?(Integer) && value.between?(0, 1_000_000)
            attributes[field == "errors" ? "error_count" : field] = value
          end
          AsjjfFetcherHeartbeat.create_or_find_by!(fetcher_id: @fetcher_id).update!(attributes.merge(received_at: Time.current))
          head :no_content
        rescue JSON::ParserError, KeyError, TypeError => e
          invalid_payload(e)
        end

        private

        def authenticate_fetcher!
          secret = ENV["ASJJF_FETCHER_SECRET"]
          return head :not_found if secret.blank?
          @raw_body = request.body&.read.to_s
          request.body&.rewind
          @fetcher_id = request.headers["X-Asjjf-Fetcher-Id"].to_s
          timestamp = request.headers["X-Asjjf-Timestamp"].to_s
          signature = request.headers["X-Asjjf-Signature"].to_s
          return head :unauthorized unless @fetcher_id.match?(/\A[a-zA-Z0-9_.-]{1,80}\z/) && timestamp.match?(/\A\d{1,12}\z/)
          return head :unauthorized if (Time.current.to_i - timestamp.to_i).abs > 300
          message = "#{timestamp}\n#{request.request_method}\n#{request.original_fullpath}\n#{Digest::SHA256.hexdigest(@raw_body)}"
          expected = OpenSSL::HMAC.hexdigest("SHA256", secret, message)
          return head :unauthorized unless signature.match?(/\A[0-9a-f]{64}\z/) && ActiveSupport::SecurityUtils.secure_compare(expected, signature)
          unless AsjjfFetcherRateLimit.allow_request?(secret)
            response.set_header("Retry-After", "60")
            head :too_many_requests
          end
        end

        def invalid_payload(error)
          render json: { error: error.message }, status: :unprocessable_entity
        end

        def missing_record
          head :not_found
        end

        def invalid_lease(error)
          render json: { error: error.message }, status: :conflict
        end
      end
    end
  end
end
