class AsjjfCalendarRun < ApplicationRecord
  belongs_to :snapshot, class_name: "AsjjfSnapshot"
end
