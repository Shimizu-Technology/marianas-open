require "zlib"

class AcademyLinker
  class << self
    def link_all
      link_results(EventResult.all)
    end

    def link_event(event)
      link_results(event.event_results)
    end

    def link_results(results)
      created_before = Academy.count
      linked = 0
      competitor_ids = []
      results.find_each do |result|
        academy = resolve(result.academy)
        result.update_columns(academy_id: academy&.id)
        linked += 1 if academy
        competitor_ids << result.competitor_id if result.competitor_id
      end
      Competitor.where(id: competitor_ids.uniq).find_each(&:refresh_current_academy!)
      { created: Academy.count - created_before, linked: linked }
    end

    # create:false is strictly read-only, including the review queue.
    def resolve(raw_name, create: true)
      name = Identity::NameNormalizer.display(raw_name)
      return nil if name.blank?
      key = Identity::NameNormalizer.key(name)
      return lookup(name) unless create

      Academy.transaction do
        # All auto-creation/queue decisions share one lock so two close names
        # imported concurrently cannot both bypass near-duplicate detection.
        Academy.connection.execute("SELECT pg_advisory_xact_lock(184527001)")
        matches = Academy.identity_matches(name)
        return matches.first if matches.one?
        return nil if matches.many?

        review = IdentityReview.find_by(normalized_name: key)
        return review.resolved_academy if review&.status == "resolved"
        return nil if review

        candidates = Academy.all.flat_map { |academy| ([ academy.name ] + Array(academy.aliases)).map { |value| [ academy, Identity::NameNormalizer.key(value) ] } }
        closest = candidates.min_by { |_, candidate_key| distance(key, candidate_key) }
        candidate, candidate_key = closest if closest
        if candidate && near?(key, candidate_key)
          IdentityReview.create!(raw_name: name, normalized_name: key, candidate_academy: candidate)
          return nil
        end

        Academy.create!(name: name, unaffiliated: %w[other independent unaffiliated].include?(key))
      end
    end

    # Legacy callers pass athlete nationality. It is deliberately ignored:
    # a gym's country must be set from its location by staff.
    def find_or_create(name, _country_code = nil)
      resolve(name)
    end

    def lookup(name)
      matches = Academy.identity_matches(name)
      return matches.first if matches.one?
      return nil if matches.many?
      IdentityReview.find_by(normalized_name: Identity::NameNormalizer.key(name), status: "resolved")&.resolved_academy
    end

    def near?(left, right)
      return false if [ left.length, right.length ].min < 6
      distance(left, right) <= ([ left.length, right.length ].min >= 12 ? 2 : 1)
    end

    def distance(left, right)
      previous = (0..right.length).to_a
      left.each_char.with_index(1) do |char, i|
        current = [ i ]
        right.each_char.with_index(1) do |other, j|
          current[j] = [ current[j - 1] + 1, previous[j] + 1, previous[j - 1] + (char == other ? 0 : 1) ].min
        end
        previous = current
      end
      previous.last
    end
  end
end
