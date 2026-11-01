require_relative "base"

module Asjjf
  module Parsers
    class Division
      BELT = /White|Gr[ae]y|Yellow|Orange|Green|Blue|Purple|Brown|Black/i
      AGE = /(?:Juvenile\s+\d+(?:-\d+)?|Adult(?:\s+\d+)?|Master\s+\d+|Kid\s+\d+)/i

      # Keep source name, age and weight labels. Normalize only gender and belt casing.
      # Accept both published orders, e.g. Female Blue Adult 18 / Female Adult 18 Blue.
      def self.parse(name, weight: false)
        match = name.match(/\A(Male|Female)\s+(?:(#{BELT})\s+(#{AGE})|(#{AGE})\s+(#{BELT}))(?:\s+(.+))?\z/i)
        raise ParseError, "Unrecognized division: #{name}" unless match
        weight_name = match[6]
        raise ParseError, "Missing division weight: #{name}" if weight && !weight_name
        raise ParseError, "Unexpected ranking weight: #{name}" if !weight && weight_name

        { name: name, gender: match[1].downcase, belt: (match[2] || match[5]).downcase,
          age: match[3] || match[4] }.tap { |result| result[:weight] = weight_name if weight }
      end
    end
  end
end
