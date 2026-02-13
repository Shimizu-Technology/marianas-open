module Api
  module V1
    class SiteContentsController < ApplicationController
      def index
        contents = SiteContent.all.order(:section, :sort_order)
        result = {}
        contents.each do |c|
          result[c.key] = {
            en: c.value_en,
            ja: c.value_ja,
            ko: c.value_ko,
            tl: c.value_tl,
            zh: c.value_zh
          }
        end
        render json: result
      end
    end
  end
end
