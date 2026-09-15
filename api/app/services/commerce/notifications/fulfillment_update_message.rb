require "cgi"

module Commerce
  module Notifications
    class FulfillmentUpdateMessage
      Message = Data.define(:subject, :html, :text)

      def initialize(order:, status:)
        @order = order
        @status = status
      end

      def call
        status == "ready_for_pickup" ? pickup_message : tracking_message
      end

      private

      attr_reader :order, :status

      def pickup_message
        location = order.inventory_location
        detail = [ location.name, *location.public_address.values_at("street1", "street2", "city", "state", "zip").compact ].join(", ")
        build(
          subject: "Order #{order.number} is ready for pickup",
          heading: "Your order is ready at Deal Depot.",
          body: "Bring your order number when you pick it up. Pickup location: #{detail}."
        )
      end

      def tracking_message
        shipment = order.shipment
        body = "#{shipment.carrier} #{shipment.service} tracking: #{shipment.tracking_code}."
        body += " Track your package: #{shipment.tracking_url}." if shipment.tracking_url.present?
        build(subject: "Tracking for order #{order.number}", heading: "Your Marianas Open order has tracking.", body:)
      end

      def build(subject:, heading:, body:)
        url = "#{FrontendUrl.origin}/shop/orders/#{order.public_token}"
        text = "#{heading}\n\n#{body}\n\nView order status: #{url}\n\nQuestions? #{support_email}."
        html = <<~HTML
          <!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
          <body style="margin:0;background:#090b10;color:#eceff4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:28px 14px">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:580px;background:#11141a;border:1px solid #252933;border-radius:16px"><tr><td style="padding:30px 26px">
                <p style="margin:0;color:#d4a843;font-size:11px;font-weight:700;letter-spacing:.2em;text-transform:uppercase">Order #{h(order.number)}</p>
                <h1 style="margin:10px 0 0;color:#fff;font-size:25px;line-height:1.25">#{h(heading)}</h1>
                <p style="margin:16px 0;color:#a4aab5;font-size:15px;line-height:1.7">#{h(body)}</p>
                <a href="#{h(url)}" style="display:inline-block;margin-top:8px;padding:13px 24px;border-radius:999px;background:#d4a843;color:#090b10;font-weight:700;text-decoration:none">View order status</a>
                <p style="margin:24px 0 0;color:#737986;font-size:11px">Questions? #{h(support_email)}</p>
              </td></tr></table>
            </td></tr></table>
          </body></html>
        HTML
        Message.new(subject:, html:, text:)
      end

      def support_email
        ENV["COMMERCE_SUPPORT_EMAIL"].presence || order.organization.contact_email.presence || "moguam@marianasopen.com"
      end

      def h(value)
        CGI.escapeHTML(value.to_s)
      end
    end
  end
end
