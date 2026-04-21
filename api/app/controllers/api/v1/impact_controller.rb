module Api
  module V1
    class ImpactController < ApplicationController
      def index
        metrics = ImpactMetric.active
        allocations = FundAllocation.active
        total = allocations.sum(:amount)
        config = ImpactConfiguration.first

        render json: {
          impact_metrics: metrics.as_json,
          fund_allocations: allocations.map { |a|
            a.as_json.merge(percentage: a.percentage(total))
          },
          total_amount: total,
          roi: {
            economic_impact: config&.economic_impact || 0,
            economic_impact_label: config&.economic_impact_label || "Economic Impact",
            investment_label: config&.investment_label || "Total Investment",
            investment_total: total,
            roi_multiplier: config ? config.roi_multiplier(total) : 0,
            roi_description: config&.roi_description,
            year_label: config&.year_label
          }
        }
      end

      def status
        has_data = ImpactMetric.active.exists? || FundAllocation.active.exists?
        render json: { visible: has_data }
      end
    end
  end
end
