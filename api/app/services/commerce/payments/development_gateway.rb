module Commerce
  module Payments
    class DevelopmentGateway
      def create_checkout_session(order:)
        frontend = ENV.fetch("PUBLIC_FRONTEND_URL", "http://localhost:5173").delete_suffix("/")
        {
          id: "cs_test_dev_#{SecureRandom.hex(12)}",
          url: "#{frontend}/shop/orders/#{order.public_token}?test_checkout=1"
        }
      end
    end
  end
end
