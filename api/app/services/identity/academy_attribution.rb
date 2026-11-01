module Identity
  # Compatibility for the interval before the manual FK backfill. This derives
  # links from each result's own academy text, never from the athlete's gym.
  # It writes nothing and deliberately leaves collisions unresolved.
  module AcademyAttribution
    module_function

    def name_map
      map = Hash.new { |hash, key| hash[key] = [] }
      Academy.find_each do |academy|
        ([ academy.name ] + Array(academy.aliases)).each do |name|
          map[NameNormalizer.key(name)] << academy
        end
      end
      resolved = map.transform_values { |academies| academies.uniq(&:id).one? ? academies.first : nil }
      IdentityReview.where(status: "resolved").includes(:resolved_academy).find_each do |review|
        resolved[review.normalized_name] = review.resolved_academy unless resolved.key?(review.normalized_name)
      end
      resolved
    end

    def legacy_ids
      map = name_map
      EventResult.where(academy_id: nil).distinct.pluck(:academy).filter_map do |name|
        academy = map[NameNormalizer.key(name)]
        [ name, academy.id ] if academy
      end
    end

    def query
      table = EventResult.arel_table
      pairs = legacy_ids
      value = table[:academy_id]
      if pairs.any?
        legacy_case = Arel::Nodes::Case.new(table[:academy])
        pairs.each { |name, id| legacy_case.when(name).then(id) }
        value = Arel::Nodes::NamedFunction.new("COALESCE", [ value, legacy_case ])
      end
      table.project(table[Arel.star], value.as("attributed_academy_id"))
    end

    def results_sql
      "(#{query.to_sql})"
    end

    def relation
      EventResult.from(query.as("event_results"))
    end

    def id_sql
      "event_results.attributed_academy_id"
    end
  end
end
