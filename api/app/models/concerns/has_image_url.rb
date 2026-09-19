module HasImageUrl
  extend ActiveSupport::Concern

  class_methods do
    def image_url_for(*attachments)
      attachments.each do |attachment_name|
        define_method(:"#{attachment_name}_url") do
          attachment = send(attachment_name)
          return nil unless attachment.attached?

          Rails.application.routes.url_helpers.rails_blob_url(attachment, only_path: true)
        rescue StandardError
          nil
        end
      end
    end
  end
end
