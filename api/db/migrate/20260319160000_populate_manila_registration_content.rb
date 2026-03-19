class PopulateManilaRegistrationContent < ActiveRecord::Migration[8.1]
  def up
    update_manila_registration_content!(
      registration_fee_sections: registration_fee_sections_payload,
      registration_info_items: registration_info_items_payload
    )
  end

  def down
    update_manila_registration_content!(
      registration_fee_sections: [],
      registration_info_items: []
    )
  end

  private

  def update_manila_registration_content!(attributes)
    connection = ActiveRecord::Base.connection
    connection.schema_cache.clear!
    connection.clear_cache!
    Event.reset_column_information

    connection.unprepared_statement do
      manila = Event.find_by(slug: "marianas-pro-manila-2026")
      return unless manila

      manila.update!(attributes)
    end
  end

  def registration_fee_sections_payload
    [
      {
        title: "Kids Divisions",
        rows: [
          { deadline: "Until February 10, 2026 11:59 PM", fee: "Php1,800", option: "Weight Division" },
          { deadline: "Until March 10, 2026 11:59 PM", fee: "Php2,200", option: "Weight Division" },
          { deadline: "Until April 15, 2026 11:59 PM", fee: "Php2,600", option: "Weight Division" },
          { deadline: "Until April 18, 2026 11:59 PM", fee: "Php3,300", option: "Weight Division" }
        ]
      },
      {
        title: "Juvenile / Adult / Master Divisions",
        rows: [
          { deadline: "Until February 10, 2026 11:59 PM", fee: "Php1,800", option: "Weight Division" },
          { deadline: "Until February 10, 2026 11:59 PM", fee: "Php2,300", option: "Weight Division + Open Weight" },
          { deadline: "Until March 10, 2026 11:59 PM", fee: "Php2,200", option: "Weight Division" },
          { deadline: "Until March 10, 2026 11:59 PM", fee: "Php2,700", option: "Weight Division + Open Weight" },
          { deadline: "Until April 15, 2026 11:59 PM", fee: "Php2,600", option: "Weight Division" },
          { deadline: "Until April 15, 2026 11:59 PM", fee: "Php3,200", option: "Weight Division + Open Weight" },
          { deadline: "Until April 18, 2026 11:59 PM", fee: "Php3,300", option: "Weight Division" },
          { deadline: "Until April 18, 2026 11:59 PM", fee: "Php3,900", option: "Weight Division + Open Weight" }
        ]
      }
    ]
  end

  def registration_info_items_payload
    [
      { label: "Registration closes", value: "April 15, 2026 at 11:59 PM" },
      { label: "Correction deadline", value: "April 17, 2026 at 11:59 PM" },
      { label: "Refund request deadline", value: "April 20, 2026 for athletes with no opponents in their division" },
      { label: "Registration check day", value: "April 18, 2026" },
      { label: "Organizer correction day", value: "April 21, 2026" },
      { label: "Schedule and brackets release", value: "April 23, 2026" }
    ]
  end
end
