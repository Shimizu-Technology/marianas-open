require "cgi"

module Commerce
  module Notifications
    class OrderPaidMessage
      Message = Data.define(:subject, :html, :text)

      def initialize(order:, audience:)
        @order = order
        @audience = audience.to_s
      end

      def call
        case audience
        when "customer"
          customer_message
        when "operations"
          operations_message
        else
          raise ArgumentError, "Unknown order notification audience."
        end
      end

      private

      attr_reader :order, :audience

      def customer_message
        Message.new(
          subject: "Order #{order.number} confirmed — Marianas Open",
          text: customer_text,
          html: email_shell(
            eyebrow: "Payment confirmed",
            heading: "Thanks, #{h(first_name)} — your order is confirmed.",
            introduction: "We received your payment of #{h(money(order.total_cents))}. Keep this email for your order number and live status link.",
            details: customer_details,
            button_label: "View order status",
            button_url: order_url
          )
        )
      end

      def operations_message
        Message.new(
          subject: "New paid #{order.fulfillment_method} order #{order.number}",
          text: operations_text,
          html: email_shell(
            eyebrow: "New paid order",
            heading: "#{h(order.number)} is ready for fulfillment.",
            introduction: "#{h(order.customer_name)} paid #{h(money(order.total_cents))} for #{h(order.fulfillment_method)}.",
            details: operations_details,
            button_label: "Open customer status",
            button_url: order_url
          )
        )
      end

      def customer_text
        <<~TEXT
          Marianas Open order #{order.number}

          Payment confirmed: #{money(order.total_cents)}
          #{fulfillment_summary}

          Items:
          #{text_items}

          View your order status: #{order_url}

          Questions? Contact #{support_email}.
        TEXT
      end

      def operations_text
        <<~TEXT
          New paid order #{order.number}

          Customer: #{order.customer_name} <#{order.customer_email}>
          Method: #{order.fulfillment_method}
          Total: #{money(order.total_cents)}
          #{fulfillment_summary}

          Items:
          #{text_items}

          Customer status link: #{order_url}
        TEXT
      end

      def customer_details
        section("Order summary", items_table) + section("What happens next", "<p style=\"margin:0;color:#c3c8d2;line-height:1.7\">#{h(fulfillment_summary)}</p>")
      end

      def operations_details
        customer = "<p style=\"margin:0;color:#c3c8d2;line-height:1.7\"><strong style=\"color:#fff\">#{h(order.customer_name)}</strong><br>#{h(order.customer_email)}#{order.customer_phone.present? ? "<br>#{h(order.customer_phone)}" : ""}</p>"
        section("Customer", customer) + section("Items", items_table) + section("Fulfillment", "<p style=\"margin:0;color:#c3c8d2;line-height:1.7\">#{h(fulfillment_summary)}</p>")
      end

      def items_table
        "<table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\">#{html_items}#{total_row}</table>"
      end

      def html_items
        order.order_items.order(:id).map do |item|
          "<tr><td style=\"padding:8px 0;color:#eceff4\">#{h(item.product_name)}<br><span style=\"color:#858b98;font-size:12px\">#{h(item.variant_name)} · Qty #{item.quantity}</span></td><td align=\"right\" style=\"padding:8px 0;color:#eceff4;white-space:nowrap\">#{h(money(item.line_total_cents))}</td></tr>"
        end.join
      end

      def total_row
        "<tr><td style=\"padding:12px 0 0;border-top:1px solid #30343d;color:#c3c8d2\">Total</td><td align=\"right\" style=\"padding:12px 0 0;border-top:1px solid #30343d;color:#d4a843;font-weight:700\">#{h(money(order.total_cents))}</td></tr>"
      end

      def section(title, content)
        <<~HTML
          <div style="margin-top:22px;padding:18px;border:1px solid #30343d;border-radius:12px;background:#171a20">
            <p style="margin:0 0 10px;color:#d4a843;font-size:11px;font-weight:700;letter-spacing:.16em;text-transform:uppercase">#{h(title)}</p>
            #{content}
          </div>
        HTML
      end

      def email_shell(eyebrow:, heading:, introduction:, details:, button_label:, button_url:)
        <<~HTML
          <!doctype html>
          <html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
          <body style="margin:0;background:#090b10;color:#eceff4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#090b10"><tr><td align="center" style="padding:28px 14px">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:580px;background:#11141a;border:1px solid #252933;border-radius:16px;overflow:hidden">
                <tr><td style="height:4px;background:#d4a843"></td></tr>
                <tr><td style="padding:30px 26px">
                  <p style="margin:0;color:#d4a843;font-size:11px;font-weight:700;letter-spacing:.2em;text-transform:uppercase">#{h(eyebrow)}</p>
                  <h1 style="margin:10px 0 0;color:#fff;font-size:25px;line-height:1.25">#{heading}</h1>
                  <p style="margin:14px 0 0;color:#a4aab5;font-size:15px;line-height:1.7">#{introduction}</p>
                  #{details}
                  <table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0 0"><tr><td style="border-radius:999px;background:#d4a843"><a href="#{h(button_url)}" style="display:inline-block;padding:13px 24px;color:#090b10;font-weight:700;text-decoration:none">#{h(button_label)}</a></td></tr></table>
                  <p style="margin:24px 0 0;color:#737986;font-size:11px;line-height:1.6">Order #{h(order.number)} · Questions? #{h(support_email)}</p>
                </td></tr>
              </table>
            </td></tr></table>
          </body></html>
        HTML
      end

      def text_items
        order.order_items.order(:id).map do |item|
          "- #{item.product_name} — #{item.variant_name}, qty #{item.quantity}: #{money(item.line_total_cents)}"
        end.join("\n")
      end

      def fulfillment_summary
        if order.fulfillment_method == "pickup"
          "Deal Depot will prepare your order for pickup. Wait for the ready notification before heading over."
        else
          "Deal Depot will pack your order. We will send tracking as soon as the shipping label is created."
        end
      end

      def order_url
        "#{FrontendUrl.origin}/shop/orders/#{order.public_token}"
      end

      def support_email
        ENV["COMMERCE_SUPPORT_EMAIL"].presence || order.organization.contact_email.presence || "moguam@marianasopen.com"
      end

      def money(cents)
        format("%s %.2f", order.currency, cents / 100.0)
      end

      def first_name
        order.customer_name.split.first.presence || order.customer_name
      end

      def h(value)
        CGI.escapeHTML(value.to_s)
      end
    end
  end
end
