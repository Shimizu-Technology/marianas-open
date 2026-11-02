module PhotoIntake
  module EventLock
    # Session advisory lock, not a transaction spanning storage/network IO. All
    # intake/review workers use the same lock, released even on exception/crash.
    def self.with(event_id)
      ApplicationRecord.connection_pool.with_connection do |connection|
        key = 4_000_000_000_000 + Integer(event_id)
        connection.execute("SELECT pg_advisory_lock(#{key})")
        begin
          yield
        ensure
          connection.execute("SELECT pg_advisory_unlock(#{key})")
        end
      end
    end
  end
end
