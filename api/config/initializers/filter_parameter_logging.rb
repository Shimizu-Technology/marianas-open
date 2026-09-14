# Be sure to restart your server when you modify this file.

# Configure parameters to be partially matched (e.g. passw matches password) and filtered from the log file.
# Use this to limit dissemination of sensitive information.
# See the ActiveSupport::ParameterFilter documentation for supported notations and behaviors.
Rails.application.config.filter_parameters += [
  :passw, :email, :secret, :token, :_key, :crypt, :salt, :certificate, :otp, :ssn, :cvv, :cvc,
  :street1, :street2, :postal, :zip, :phone,
  "shipping_quote.address.name", "shipping_quote.address.company", "shipping_quote.address.city",
  "shipping_quote.address.state", "shipping_quote.address.country"
]
