module Api
  module V1
    class ImpactController < ApplicationController
      def index
        metrics = ImpactMetric.active
        allocations = FundAllocation.active
        total = allocations.sum(:amount)
        config = ImpactConfiguration.current

        render json: {
          impact_metrics: metrics.as_json,
          fund_allocations: allocations.map { |a|
            a.as_json.merge(percentage: a.percentage(total))
          },
          total_amount: total,
          roi: {
            economic_impact: config.economic_impact,
            economic_impact_label: config.economic_impact_label,
            investment_label: config.investment_label,
            investment_total: total,
            roi_multiplier: config.roi_multiplier(total),
            roi_description: config.roi_description,
            year_label: config.year_label
          }
        }
      end
    end
  end
end
