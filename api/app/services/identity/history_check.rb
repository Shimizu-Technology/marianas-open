module Identity
  # Warnings require human review. Automatic repair accepts only an empty list.
  class HistoryCheck
    BELTS = { "white" => 0, "gray" => 1, "grey" => 1, "yellow" => 2, "orange" => 3,
              "green" => 4, "blue" => 5, "purple" => 6, "brown" => 7, "black" => 8 }.freeze

    def self.call(source, target, results: nil)
      new(source, target, results: results).warnings
    end

    def initialize(source, target, results: nil)
      @people = [ source, target ]
      @results = results || EventResult.where(competitor_id: @people.map(&:id)).includes(:event).to_a
    end

    def warnings
      found = []
      found << "Identity explicitly marked as different people" if @people.any?(&:identity_separate?)
      found << "Missing result history for one or both athletes" if @people.any? { |p| @results.none? { |r| r.competitor_id == p.id } }
      names = @results.flat_map { |r| [ r.competitor_name, (r[:raw_competitor_name] if r.has_attribute?(:raw_competitor_name)) ].compact } + @people.map { |p| "#{p.last_name} #{p.first_name}" }
      if names.any? { |name| truncated?(name) }
        found << "Possibly truncated athlete name; verify the complete identity"
      end
      identity_keys = @people.flat_map { |p| [ NameNormalizer.key("#{p.first_name} #{p.last_name}"), NameNormalizer.key("#{p.last_name} #{p.first_name}") ] }
      raw_names = @results.map { |r| (r[:raw_competitor_name] if r.has_attribute?(:raw_competitor_name)).presence || r.competitor_name }
      if raw_names.any? { |name| !identity_keys.include?(NameNormalizer.key(name)) }
        found << "Result names differ from the selected athlete identities"
      end
      genders = @results.map { |r| r.gender.to_s.strip.downcase.presence }.compact.uniq
      found << "Conflicting genders in result history: #{genders.sort.join(', ')}" if genders.size > 1
      @results.group_by(&:event_id).each do |event_id, rows|
        ages = rows.map { |r| r.age_category.to_s.downcase }
        if ages.any? { |age| age.match?(/\A(?:kid|child|infant|pee_?wee|junior|teen)/) } &&
            ages.any? { |age| age.match?(/\A(?:adult|master)/) }
          found << "Kid and adult divisions at the same event (#{event_id})"
        end
      end
      found << "Undated events prevent a complete belt timeline" if @results.any? { |r| r.event&.date.nil? }
      # Compare different dates, not divisions at the same tournament. A child
      # moving from a colored youth belt to adult white is a normal transition.
      dated = @results.select { |r| r.event&.date && BELTS.key?(belt(r)) }
      dated.group_by { |r| youth?(r) }.each_value do |rows|
        highest = -1
        rows.group_by { |r| r.event.date }.sort_by(&:first).each do |date, day|
          ranks = day.map { |r| BELTS.fetch(belt(r)) }
          found << "Belt order regression on #{date}" if ranks.min < highest
          highest = [ highest, ranks.max ].max
        end
      end
      found.uniq
    end

    private

    def truncated?(name)
      display = NameNormalizer.display(name)
      display.match?(/(?:\.{2,}|…)\s*\z/) || display.length == 20 || display.split.size < 2
    end

    def belt(result)
      result.belt_rank.to_s.downcase.split(/[-\/]/).first.to_s.strip
    end

    def youth?(result)
      result.age_category.to_s.match?(/\A(?:kid|child|infant|pee_?wee|junior|teen)/i)
    end
  end
end
