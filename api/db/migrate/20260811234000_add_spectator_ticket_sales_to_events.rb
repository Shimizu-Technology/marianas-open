class AddSpectatorTicketSalesToEvents < ActiveRecord::Migration[8.1]
  TICKET_OPTIONS = [
    {
      label: "1-Day Child",
      description: "4–12 yrs",
      early_bird_price: "17.00",
      regular_price: "20.00"
    },
    {
      label: "1-Day Adult",
      description: "",
      early_bird_price: "22.00",
      regular_price: "25.00"
    },
    {
      label: "2-Day Child",
      description: "4–12 yrs",
      early_bird_price: "25.00",
      regular_price: "30.00"
    },
    {
      label: "2-Day Adult",
      description: "",
      early_bird_price: "35.00",
      regular_price: "45.00"
    }
  ].freeze

  def up
    add_column :events, :ticket_sales_status, :string, default: "unavailable", null: false
    add_column :events, :ticket_sales_url, :string
    add_column :events, :ticket_early_bird_ends_on, :date
    add_column :events, :ticket_options, :jsonb, default: [], null: false
    add_column :events, :ticket_in_person_name, :string
    add_column :events, :ticket_in_person_phone, :string
    add_column :events, :ticket_in_person_address, :text

    add_check_constraint :events,
      "ticket_sales_status IN ('unavailable', 'on_sale', 'sold_out', 'closed')",
      name: "events_ticket_sales_status_check"

    execute <<~SQL.squish
      UPDATE events
      SET ticket_sales_status = 'on_sale',
          ticket_sales_url = 'https://events.guamtime.net/event/guam-marianas-open-international-championship-2026',
          ticket_options = #{connection.quote(TICKET_OPTIONS.to_json)}::jsonb,
          ticket_in_person_name = 'Deal Depot',
          ticket_in_person_phone = '671-647-3325',
          ticket_in_person_address = '114 East Taitano Road, Tamuning, 96913, Guam'
      WHERE slug = 'marianas-open-2026'
    SQL
  end

  def down
    remove_check_constraint :events, name: "events_ticket_sales_status_check"
    remove_column :events, :ticket_in_person_address
    remove_column :events, :ticket_in_person_phone
    remove_column :events, :ticket_in_person_name
    remove_column :events, :ticket_options
    remove_column :events, :ticket_early_bird_ends_on
    remove_column :events, :ticket_sales_url
    remove_column :events, :ticket_sales_status
  end
end
