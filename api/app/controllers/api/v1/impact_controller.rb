module Api
  module V1
    class ImpactController < ApplicationController
      def index
        metrics = ImpactMetric.active
        allocations = FundAllocation.active
        total = allocations.sum(:amount)

        render json: {
          impact_metrics: metrics.as_json,
          fund_allocations: allocations.map { |a|
            a.as_json.merge(percentage: a.percentage(total))
          },
          total_amount: total
        }
      end
    end
  end
end
