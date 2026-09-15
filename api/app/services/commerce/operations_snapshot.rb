require "csv"

module Commerce
  class OperationsSnapshot
    MAX_RANGE = 366.days

    def initialize(organization:, from: nil, to: nil)
      @organization = organization
      @from = parse_date(from, 29.days.ago.to_date).beginning_of_day
      @to = parse_date(to, Time.zone.today).end_of_day
      raise ArgumentError, "Report end date must be on or after its start date." if @to < @from
      raise ArgumentError, "Report range cannot exceed 366 days." if @to - @from > MAX_RANGE
    end

    def as_json
      {
        period: period,
        summary: summary,
        reconciliation: reconciliation,
        alerts: alerts.first(100),
        recent_refunds: recent_refunds
      }
    end

    def period
      { from: from.to_date, to: to.to_date }
    end

    def to_csv
      CSV.generate(headers: true) do |csv|
        csv << %w[order_number paid_at customer_email fulfillment_method currency subtotal shipping tax total refunded net fulfillment_status]
        report_orders.each do |order|
          refunded = order.refunded_cents
          csv << [
            csv_cell(order.number), order.paid_at&.iso8601, csv_cell(order.customer_email),
            csv_cell(order.fulfillment_method), csv_cell(order.currency),
            order.subtotal_cents, order.shipping_cents, order.tax_cents, order.total_cents, refunded,
            order.total_cents - refunded, csv_cell(order.fulfillment&.status || "unfulfilled")
          ]
        end
      end
    end

    private

    attr_reader :organization, :from, :to

    def report_orders
      paid_orders_in_period.includes(:fulfillment, :order_refunds)
    end

    def paid_orders_in_period
      organization.orders.where(status: "paid", paid_at: from..to).order(:paid_at, :id)
    end

    def period_refunds
      OrderRefund.successful.joins(:order).where(orders: { organization_id: organization.id }, processed_at: from..to)
    end

    def summary
      orders = paid_orders_in_period
      gross = orders.sum(:total_cents)
      refunds = period_refunds.sum(:amount_cents)
      {
        paid_orders: orders.count,
        gross_cents: gross,
        refunded_cents: refunds,
        net_cents: gross - refunds,
        shipping_cents: orders.sum(:shipping_cents),
        tax_cents: orders.sum(:tax_cents),
        currency: orders.pick(:currency) || "USD"
      }
    end

    def reconciliation
      paid = organization.orders.where(status: "paid")
      {
        current: paid.where(last_reconciled_at: 6.hours.ago..).count,
        due: paid.where(last_reconciled_at: nil).or(paid.where(last_reconciled_at: ...6.hours.ago)).count,
        last_completed_at: paid.maximum(:last_reconciled_at)
      }
    end

    def alerts
      (payment_alerts + event_alerts + notification_alerts + shipment_alerts + refund_alerts)
        .sort_by { |alert| alert[:occurred_at] || Time.at(0) }.reverse
    end

    def payment_alerts
      organization.orders.where(status: "paid").where.not(payment_error: [ nil, "" ]).limit(50).map do |order|
        alert("payment", "Payment needs reconciliation", order.payment_error, order:, occurred_at: order.updated_at,
          reference: "order-#{order.id}")
      end
    end

    def event_alerts
      PaymentEvent.where(status: "failed", order_id: organization.orders.select(:id)).includes(:order).limit(50).map do |event|
        alert("payment", "Stripe event failed", event.processing_error.presence || event.event_type, order: event.order,
          occurred_at: event.updated_at, reference: "event-#{event.id}")
      end
    end

    def notification_alerts
      OrderNotification.where(status: "failed", order_id: organization.orders.select(:id)).includes(:order).limit(50).map do |notification|
        alert("notification", "Customer message failed", notification.last_error.presence || notification.kind,
          order: notification.order, occurred_at: notification.updated_at, reference: "notification-#{notification.id}")
      end
    end

    def shipment_alerts
      Shipment.where(status: %w[failure return_to_sender error], order_id: organization.orders.select(:id)).includes(:order).limit(50).map do |shipment|
        alert("shipping", "Shipment needs attention", shipment.last_error.presence || shipment.status.humanize,
          order: shipment.order, occurred_at: shipment.updated_at, reference: "shipment-#{shipment.id}")
      end
    end

    def refund_alerts
      scope = OrderRefund.where(status: %w[failed requires_action error], order_id: organization.orders.select(:id))
        .or(OrderRefund.where(status: %w[pending_provider pending], order_id: organization.orders.select(:id), updated_at: ...1.day.ago))
      scope.includes(:order).limit(50).map do |refund|
        alert("refund", "Refund needs attention", refund.failure_reason.presence || refund.status.humanize,
          order: refund.order, occurred_at: refund.updated_at, reference: "refund-#{refund.id}")
      end
    end

    def alert(category, title, detail, order:, occurred_at:, reference:)
      {
        key: "#{category}-#{reference}", category:, title:, detail: detail.to_s.first(500),
        order_id: order&.id, order_number: order&.number, occurred_at:
      }
    end

    def recent_refunds
      OrderRefund.where(order_id: organization.orders.select(:id)).includes(:order, :requested_by)
        .order(requested_at: :desc).limit(25).map do |refund|
        {
          id: refund.id, order_id: refund.order_id, order_number: refund.order.number,
          amount_cents: refund.amount_cents, currency: refund.currency, status: refund.status,
          reason: refund.reason, source: refund.source, requested_by: refund.requested_by&.email,
          requested_at: refund.requested_at, processed_at: refund.processed_at,
          failure_reason: refund.failure_reason
        }
      end
    end

    def parse_date(value, fallback)
      value.present? ? Date.iso8601(value.to_s) : fallback
    rescue Date::Error
      raise ArgumentError, "Use a valid date in YYYY-MM-DD format."
    end

    def csv_cell(value)
      string = value.to_s
      string.match?(/\A[=+\-@]/) ? "'#{string}" : string
    end
  end
end
