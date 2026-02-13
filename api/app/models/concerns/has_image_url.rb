module HasImageUrl
  extend ActiveSupport::Concern

  class_methods do
    def image_url_for(*attachments)
      attachments.each do |attachment_name|
        define_method(:"#{attachment_name}_url") do
          attachment = send(attachment_name)
          return nil unless attachment.attached?

          if Rails.configuration.active_storage.service == :amazon
            bucket = ENV['AWS_S3_BUCKET']
            region = ENV.fetch('AWS_REGION', 'ap-southeast-2')
            "https://#{bucket}.s3.#{region}.amazonaws.com/#{attachment.key}"
          else
            Rails.application.routes.url_helpers.url_for(attachment)
          end
        rescue StandardError
          nil
        end
      end
    end
  end
end
