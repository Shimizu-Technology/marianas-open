module Identity
  class Backfill
    def self.call(apply: false, io: $stdout)
      report = nil
      ApplicationRecord.transaction do
        report = { apply: apply, results_scanned: 0, result_links_changed: 0,
                   current_gyms_changed: 0, unresolved: {}, undated_results: 0 }
        resolved = {}
        latest = {}
        EventResult.includes(:event).find_each do |result|
          report[:results_scanned] += 1
          raw = result.read_attribute(:academy)
          # No athlete nationality is passed: it is not the gym's location.
          academy = resolved.fetch(raw) { resolved[raw] = AcademyLinker.resolve(raw, create: apply) }
          report[:unresolved][raw.to_s] = report[:unresolved].fetch(raw.to_s, 0) + 1 unless academy
          if result.academy_id != academy&.id
            report[:result_links_changed] += 1
            result.update_columns(academy_id: academy&.id) if apply
          end
          date = result.event&.date
          report[:undated_results] += 1 unless date
          order = [ date || Date.new(1, 1, 1), result.event_id, result.id ]
          previous = latest[result.competitor_id]
          if result.competitor_id && (previous.nil? || (order <=> previous[:order]) == 1)
            latest[result.competitor_id] = { order: order, academy_id: academy&.id }
          end
        end
        Competitor.where(id: latest.keys).find_each do |competitor|
          academy_id = latest.fetch(competitor.id).fetch(:academy_id)
          next if competitor.academy_id == academy_id
          report[:current_gyms_changed] += 1
          competitor.update_columns(academy_id: academy_id) if apply
        end
      end
      io.puts(JSON.pretty_generate(report))
      report
    end
  end
end
