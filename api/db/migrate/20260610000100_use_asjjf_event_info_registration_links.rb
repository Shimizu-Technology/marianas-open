class UseAsjjfEventInfoRegistrationLinks < ActiveRecord::Migration[8.1]
  REGISTRATION_COLUMNS = %w[registration_url registration_url_gi registration_url_nogi].freeze

  def up
    update_registration_urls(from: "/main/eventNotice/", to: "/main/eventInfo/")
  end

  def down
    update_registration_urls(from: "/main/eventInfo/", to: "/main/eventNotice/")
  end

  private

  def update_registration_urls(from:, to:)
    REGISTRATION_COLUMNS.each do |column|
      execute <<~SQL.squish
        UPDATE events
        SET #{column} = regexp_replace(#{column}, #{connection.quote(from)}, #{connection.quote(to)}, 'ig'),
            updated_at = CURRENT_TIMESTAMP
        WHERE #{column} ILIKE #{connection.quote("%#{from}%")};
      SQL
    end
  end
end
