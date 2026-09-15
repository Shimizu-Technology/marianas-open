require "cgi"

module Commerce
  module Notifications
    class RefundMessage
      Message = Data.define(:subject, :html, :text)

      def initialize(refund:)
        @refund = refund
      end

      def call
        heading = "Your refund has been issued."
        body = "We issued #{money(refund.amount_cents)} back to the original payment method for order #{refund.order.number}. Your bank may take several business days to display it."
        url = "#{FrontendUrl.origin}/shop/orders/#{refund.order.public_token}"
        text = "#{heading}\n\n#{body}\n\nView order status: #{url}\n\nQuestions? #{support_email}."
        html = <<~HTML
          <!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
          <body style="margin:0;background:#090b10;color:#eceff4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:28px 14px">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:580px;background:#11141a;border:1px solid #252933;border-radius:16px"><tr><td style="padding:30px 26px">
                <p style="margin:0;color:#d4a843;font-size:11px;font-weight:700;letter-spacing:.2em;text-transform:uppercase">Order #{h(refund.order.number)}</p>
                <h1 style="margin:10px 0 0;color:#fff;font-size:25px;line-height:1.25">#{h(heading)}</h1>
                <p style="margin:16px 0;color:#a4aab5;font-size:15px;line-height:1.7">#{h(body)}</p>
                <a href="#{h(url)}" style="display:inline-block;margin-top:8px;padding:13px 24px;border-radius:999px;background:#d4a843;color:#090b10;font-weight:700;text-decoration:none">View order status</a>
                <p style="margin:24px 0 0;color:#737986;font-size:11px">Questions? #{h(support_email)}</p>
              </td></tr></table>
            </td></tr></table>
          </body></html>
        HTML
        Message.new(subject: "Refund issued for order #{refund.order.number}", html:, text:)
      end

      private

      attr_reader :refund

      def money(cents)
        ActionController::Base.helpers.number_to_currency(cents / 100.0, unit: refund.currency == "USD" ? "$" : "#{refund.currency} ")
      end

      def support_email
        ENV["COMMERCE_SUPPORT_EMAIL"].presence || refund.order.organization.contact_email.presence || "moguam@marianasopen.com"
      end

      def h(value)
        CGI.escapeHTML(value.to_s)
      end
    end
  end
end
