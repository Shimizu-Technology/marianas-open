# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_09_19_190000) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "academies", force: :cascade do |t|
    t.jsonb "aliases", default: []
    t.string "country_code", limit: 2
    t.datetime "created_at", null: false
    t.text "description"
    t.string "facebook_url"
    t.string "instagram_url"
    t.string "location"
    t.string "name", null: false
    t.string "slug", null: false
    t.datetime "updated_at", null: false
    t.string "website_url"
    t.index ["aliases"], name: "index_academies_on_aliases", using: :gin
    t.index ["country_code"], name: "index_academies_on_country_code"
    t.index ["slug"], name: "index_academies_on_slug", unique: true
  end

  create_table "active_storage_attachments", force: :cascade do |t|
    t.bigint "blob_id", null: false
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.bigint "record_id", null: false
    t.string "record_type", null: false
    t.index ["blob_id"], name: "index_active_storage_attachments_on_blob_id"
    t.index ["record_type", "record_id", "name", "blob_id"], name: "index_active_storage_attachments_uniqueness", unique: true
  end

  create_table "active_storage_blobs", force: :cascade do |t|
    t.bigint "byte_size", null: false
    t.string "checksum"
    t.string "content_type"
    t.datetime "created_at", null: false
    t.string "filename", null: false
    t.string "key", null: false
    t.text "metadata"
    t.string "service_name", null: false
    t.index ["key"], name: "index_active_storage_blobs_on_key", unique: true
  end

  create_table "active_storage_variant_records", force: :cascade do |t|
    t.bigint "blob_id", null: false
    t.string "variation_digest", null: false
    t.index ["blob_id", "variation_digest"], name: "index_active_storage_variant_records_uniqueness", unique: true
  end

  create_table "announcements", force: :cascade do |t|
    t.boolean "active", default: true
    t.string "announcement_type", default: "info"
    t.text "body"
    t.datetime "created_at", null: false
    t.datetime "ends_at"
    t.string "link_text"
    t.string "link_url"
    t.integer "sort_order", default: 0
    t.datetime "starts_at"
    t.string "title", null: false
    t.datetime "updated_at", null: false
  end

  create_table "commerce_launch_checks", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "key", null: false
    t.text "note", default: "", null: false
    t.bigint "organization_id", null: false
    t.datetime "reviewed_at"
    t.bigint "reviewed_by_id"
    t.string "status", default: "pending", null: false
    t.datetime "updated_at", null: false
    t.index ["organization_id", "key"], name: "index_commerce_launch_checks_on_organization_id_and_key", unique: true
    t.index ["organization_id"], name: "index_commerce_launch_checks_on_organization_id"
    t.index ["reviewed_by_id"], name: "index_commerce_launch_checks_on_reviewed_by_id"
    t.check_constraint "status::text = ANY (ARRAY['pending'::character varying, 'passed'::character varying, 'blocked'::character varying]::text[])", name: "commerce_launch_checks_status_valid"
  end

  create_table "competitors", force: :cascade do |t|
    t.string "academy"
    t.bigint "academy_id"
    t.string "belt_rank"
    t.text "bio"
    t.integer "bronze_medals", default: 0, null: false
    t.string "country_code", limit: 2
    t.datetime "created_at", null: false
    t.integer "draws", default: 0, null: false
    t.string "first_name", null: false
    t.integer "gold_medals", default: 0, null: false
    t.string "instagram_url"
    t.string "last_name", null: false
    t.integer "losses", default: 0, null: false
    t.string "nickname"
    t.integer "silver_medals", default: 0, null: false
    t.datetime "updated_at", null: false
    t.string "weight_class"
    t.integer "wins", default: 0, null: false
    t.string "youtube_url"
    t.index ["academy_id"], name: "index_competitors_on_academy_id"
    t.index ["belt_rank"], name: "index_competitors_on_belt_rank"
    t.index ["country_code"], name: "index_competitors_on_country_code"
    t.index ["weight_class"], name: "index_competitors_on_weight_class"
  end

  create_table "event_accommodations", force: :cascade do |t|
    t.boolean "active", default: true, null: false
    t.string "booking_code"
    t.string "booking_url"
    t.date "check_in_date"
    t.date "check_out_date"
    t.string "contact_email"
    t.string "contact_phone"
    t.datetime "created_at", null: false
    t.text "description"
    t.bigint "event_id", null: false
    t.string "hotel_name", null: false
    t.string "inclusions"
    t.string "rate_info"
    t.string "room_types"
    t.integer "sort_order", default: 0, null: false
    t.string "translation_status", default: "untranslated", null: false
    t.jsonb "translations", default: {}, null: false
    t.datetime "updated_at", null: false
    t.index ["event_id", "active"], name: "index_event_accommodations_on_event_id_and_active"
    t.index ["event_id"], name: "index_event_accommodations_on_event_id"
    t.index ["translation_status"], name: "index_event_accommodations_on_translation_status"
  end

  create_table "event_gallery_images", force: :cascade do |t|
    t.boolean "active", default: true, null: false
    t.string "alt_text"
    t.bigint "byte_size"
    t.string "caption"
    t.string "category"
    t.string "content_type"
    t.datetime "created_at", null: false
    t.bigint "event_gallery_upload_batch_id"
    t.bigint "event_id", null: false
    t.integer "height"
    t.string "original_filename"
    t.datetime "processed_at"
    t.text "processing_error"
    t.integer "processing_requeue_count", default: 0, null: false
    t.datetime "processing_started_at"
    t.string "processing_token"
    t.integer "sort_order", default: 0, null: false
    t.string "status", default: "ready", null: false
    t.string "title"
    t.datetime "updated_at", null: false
    t.integer "vips_variant_repair_attempts", default: 0, null: false
    t.datetime "vips_variants_repaired_at"
    t.integer "width"
    t.index ["event_gallery_upload_batch_id"], name: "index_event_gallery_images_on_upload_batch_id"
    t.index ["event_id", "active"], name: "index_event_gallery_images_on_event_id_and_active"
    t.index ["event_id", "category", "sort_order"], name: "index_event_gallery_images_on_event_category_sort"
    t.index ["event_id", "sort_order"], name: "index_event_gallery_images_on_event_id_and_sort_order"
    t.index ["event_id", "status"], name: "index_event_gallery_images_on_event_id_and_status"
    t.index ["event_id"], name: "index_event_gallery_images_on_event_id"
    t.index ["processing_token"], name: "index_event_gallery_images_on_processing_token"
    t.index ["status", "processing_started_at"], name: "index_event_gallery_images_on_status_and_processing_started_at"
    t.index ["status", "vips_variants_repaired_at", "vips_variant_repair_attempts"], name: "index_event_gallery_images_on_vips_variant_repair"
  end

  create_table "event_gallery_upload_batches", force: :cascade do |t|
    t.datetime "completed_at"
    t.datetime "created_at", null: false
    t.bigint "event_id", null: false
    t.integer "failed_files", default: 0, null: false
    t.text "notes"
    t.string "status", default: "uploading", null: false
    t.string "title"
    t.bigint "total_bytes", default: 0, null: false
    t.integer "total_files", default: 0, null: false
    t.datetime "updated_at", null: false
    t.integer "uploaded_files", default: 0, null: false
    t.index ["event_id", "created_at"], name: "index_event_gallery_upload_batches_on_event_id_and_created_at"
    t.index ["event_id"], name: "index_event_gallery_upload_batches_on_event_id"
    t.index ["status"], name: "index_event_gallery_upload_batches_on_status"
  end

  create_table "event_results", force: :cascade do |t|
    t.string "academy"
    t.string "age_category"
    t.string "belt_rank"
    t.bigint "competitor_id"
    t.string "competitor_name", null: false
    t.string "country_code"
    t.datetime "created_at", null: false
    t.string "division", null: false
    t.bigint "event_id", null: false
    t.string "gender"
    t.text "notes"
    t.integer "placement", null: false
    t.string "submission_method"
    t.datetime "updated_at", null: false
    t.string "weight_class"
    t.index ["competitor_id"], name: "index_event_results_on_competitor_id"
    t.index ["competitor_name"], name: "index_event_results_on_competitor_name"
    t.index ["event_id", "belt_rank"], name: "index_event_results_on_event_id_and_belt_rank"
    t.index ["event_id", "division"], name: "index_event_results_on_event_id_and_division"
    t.index ["event_id"], name: "index_event_results_on_event_id"
  end

  create_table "event_schedule_items", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "description"
    t.bigint "event_id", null: false
    t.integer "sort_order"
    t.string "time"
    t.string "translation_status", default: "untranslated", null: false
    t.jsonb "translations", default: {}, null: false
    t.datetime "updated_at", null: false
    t.index ["event_id"], name: "index_event_schedule_items_on_event_id"
    t.index ["translation_status"], name: "index_event_schedule_items_on_translation_status"
  end

  create_table "events", force: :cascade do |t|
    t.jsonb "asjjf_event_ids", default: []
    t.integer "asjjf_stars"
    t.string "city"
    t.string "country"
    t.string "country_code"
    t.datetime "created_at", null: false
    t.date "date"
    t.text "description"
    t.date "end_date"
    t.boolean "is_main_event"
    t.decimal "latitude"
    t.boolean "live_stream_active", default: false, null: false
    t.string "live_stream_url"
    t.decimal "longitude"
    t.string "name"
    t.bigint "organization_id", null: false
    t.text "prize_description"
    t.decimal "prize_pool"
    t.string "prize_title"
    t.jsonb "registration_fee_sections", default: [], null: false
    t.jsonb "registration_info_items", default: [], null: false
    t.jsonb "registration_steps", default: [], null: false
    t.string "registration_url"
    t.string "registration_url_gi"
    t.string "registration_url_nogi"
    t.datetime "results_imported_at"
    t.text "schedule_note"
    t.string "slug"
    t.string "status"
    t.string "tagline"
    t.date "ticket_early_bird_ends_on"
    t.text "ticket_in_person_address"
    t.string "ticket_in_person_name"
    t.string "ticket_in_person_phone"
    t.jsonb "ticket_options", default: [], null: false
    t.string "ticket_sales_status", default: "unavailable", null: false
    t.string "ticket_sales_url"
    t.string "translation_status", default: "untranslated", null: false
    t.jsonb "translations", default: {}, null: false
    t.text "travel_description"
    t.jsonb "travel_items", default: [], null: false
    t.datetime "updated_at", null: false
    t.string "venue_address"
    t.jsonb "venue_highlights", default: [], null: false
    t.string "venue_name"
    t.text "visa_description"
    t.jsonb "visa_items", default: [], null: false
    t.index ["organization_id"], name: "index_events_on_organization_id"
    t.index ["translation_status"], name: "index_events_on_translation_status"
    t.check_constraint "ticket_sales_status::text = ANY (ARRAY['unavailable'::character varying::text, 'on_sale'::character varying::text, 'sold_out'::character varying::text, 'closed'::character varying::text])", name: "events_ticket_sales_status_check"
  end

  create_table "fulfillments", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "delivered_at"
    t.bigint "order_id", null: false
    t.datetime "picked_up_at"
    t.datetime "preparing_at"
    t.datetime "ready_for_pickup_at"
    t.datetime "shipped_at"
    t.text "staff_note"
    t.string "status", default: "unfulfilled", null: false
    t.datetime "updated_at", null: false
    t.bigint "updated_by_id"
    t.index ["order_id"], name: "index_fulfillments_on_order_id", unique: true
    t.index ["status", "updated_at"], name: "index_fulfillments_on_status_and_updated_at"
    t.index ["updated_by_id"], name: "index_fulfillments_on_updated_by_id"
    t.check_constraint "status::text = ANY (ARRAY['unfulfilled'::character varying, 'preparing'::character varying, 'ready_for_pickup'::character varying, 'picked_up'::character varying, 'shipped'::character varying, 'delivered'::character varying]::text[])", name: "fulfillments_status_valid"
  end

  create_table "fund_allocations", force: :cascade do |t|
    t.boolean "active", default: true, null: false
    t.decimal "amount", precision: 12, scale: 2, default: "0.0", null: false
    t.string "category", null: false
    t.string "color"
    t.datetime "created_at", null: false
    t.string "description"
    t.integer "sort_order", default: 0, null: false
    t.datetime "updated_at", null: false
    t.index ["active", "sort_order"], name: "index_fund_allocations_on_active_and_sort_order"
  end

  create_table "impact_configurations", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.decimal "economic_impact", precision: 14, scale: 2, default: "0.0", null: false
    t.string "economic_impact_label", default: "Economic Impact"
    t.string "investment_label", default: "Total Investment"
    t.text "roi_description"
    t.integer "singleton_guard", default: 0, null: false
    t.datetime "updated_at", null: false
    t.string "year_label"
    t.index ["singleton_guard"], name: "index_impact_configurations_on_singleton_guard", unique: true
  end

  create_table "impact_metrics", force: :cascade do |t|
    t.boolean "active", default: true, null: false
    t.string "category", default: "tourism", null: false
    t.datetime "created_at", null: false
    t.string "description"
    t.boolean "highlight", default: false, null: false
    t.string "icon"
    t.string "label", null: false
    t.integer "sort_order", default: 0, null: false
    t.datetime "updated_at", null: false
    t.string "value", null: false
    t.index ["active", "sort_order"], name: "index_impact_metrics_on_active_and_sort_order"
    t.index ["category"], name: "index_impact_metrics_on_category"
  end

  create_table "inventory_levels", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "inventory_location_id", null: false
    t.integer "on_hand", default: 0, null: false
    t.bigint "product_variant_id", null: false
    t.integer "reserved", default: 0, null: false
    t.datetime "updated_at", null: false
    t.index ["inventory_location_id"], name: "index_inventory_levels_on_inventory_location_id"
    t.index ["product_variant_id", "inventory_location_id"], name: "idx_inventory_levels_unique", unique: true
    t.check_constraint "on_hand >= 0", name: "inventory_levels_on_hand_nonnegative"
    t.check_constraint "reserved <= on_hand", name: "inventory_levels_reserved_within_stock"
    t.check_constraint "reserved >= 0", name: "inventory_levels_reserved_nonnegative"
  end

  create_table "inventory_locations", force: :cascade do |t|
    t.boolean "active", default: true, null: false
    t.jsonb "address", default: {}, null: false
    t.string "code", null: false
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.bigint "organization_id", null: false
    t.string "phone"
    t.boolean "pickup_enabled", default: false, null: false
    t.text "pickup_instructions", default: "", null: false
    t.boolean "shipping_enabled", default: false, null: false
    t.datetime "updated_at", null: false
    t.index ["organization_id", "code"], name: "index_inventory_locations_on_organization_id_and_code", unique: true
    t.index ["organization_id"], name: "index_inventory_locations_on_organization_id"
  end

  create_table "inventory_movements", force: :cascade do |t|
    t.integer "balance_after", null: false
    t.datetime "created_at", null: false
    t.bigint "inventory_location_id", null: false
    t.text "note", default: "", null: false
    t.bigint "performed_by_id"
    t.bigint "product_variant_id", null: false
    t.integer "quantity_delta", null: false
    t.string "reason", null: false
    t.datetime "updated_at", null: false
    t.index ["inventory_location_id"], name: "index_inventory_movements_on_inventory_location_id"
    t.index ["performed_by_id"], name: "index_inventory_movements_on_performed_by_id"
    t.index ["product_variant_id", "inventory_location_id", "created_at"], name: "idx_inventory_movements_timeline"
    t.index ["product_variant_id"], name: "index_inventory_movements_on_product_variant_id"
    t.check_constraint "balance_after >= 0", name: "inventory_movements_balance_nonnegative"
    t.check_constraint "quantity_delta <> 0", name: "inventory_movements_delta_nonzero"
  end

  create_table "inventory_reservations", force: :cascade do |t|
    t.datetime "consumed_at"
    t.datetime "created_at", null: false
    t.datetime "expires_at", null: false
    t.bigint "inventory_location_id", null: false
    t.bigint "order_id", null: false
    t.bigint "product_variant_id", null: false
    t.integer "quantity", null: false
    t.datetime "released_at"
    t.string "status", default: "active", null: false
    t.datetime "updated_at", null: false
    t.index ["inventory_location_id"], name: "index_inventory_reservations_on_inventory_location_id"
    t.index ["order_id", "product_variant_id"], name: "idx_on_order_id_product_variant_id_fdd872b0d3", unique: true
    t.index ["order_id"], name: "index_inventory_reservations_on_order_id"
    t.index ["product_variant_id"], name: "index_inventory_reservations_on_product_variant_id"
    t.index ["status", "expires_at"], name: "index_inventory_reservations_on_status_and_expires_at"
    t.check_constraint "quantity > 0", name: "inventory_reservations_quantity_positive"
  end

  create_table "order_items", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "currency", limit: 3, null: false
    t.integer "line_total_cents", null: false
    t.jsonb "options_snapshot", default: [], null: false
    t.bigint "order_id", null: false
    t.bigint "product_id", null: false
    t.string "product_name", null: false
    t.bigint "product_variant_id", null: false
    t.integer "quantity", null: false
    t.string "sku", null: false
    t.integer "unit_price_cents", null: false
    t.datetime "updated_at", null: false
    t.string "variant_name", null: false
    t.index ["order_id", "product_variant_id"], name: "index_order_items_on_order_id_and_product_variant_id", unique: true
    t.index ["order_id"], name: "index_order_items_on_order_id"
    t.index ["product_id"], name: "index_order_items_on_product_id"
    t.index ["product_variant_id"], name: "index_order_items_on_product_variant_id"
    t.check_constraint "line_total_cents = (unit_price_cents * quantity)", name: "order_items_total_matches_price"
    t.check_constraint "quantity > 0", name: "order_items_quantity_positive"
    t.check_constraint "unit_price_cents >= 0", name: "order_items_unit_price_nonnegative"
  end

  create_table "order_notifications", force: :cascade do |t|
    t.integer "attempts", default: 0, null: false
    t.datetime "created_at", null: false
    t.string "delivered_to"
    t.string "delivery_mode"
    t.text "html_body", null: false
    t.string "idempotency_key", null: false
    t.string "kind", null: false
    t.text "last_error"
    t.bigint "order_id", null: false
    t.string "provider", default: "resend", null: false
    t.string "provider_message_id"
    t.string "recipient", null: false
    t.string "reference_key", default: "order", null: false
    t.datetime "sent_at"
    t.string "status", default: "pending", null: false
    t.string "subject", null: false
    t.text "text_body", null: false
    t.datetime "updated_at", null: false
    t.index ["idempotency_key"], name: "index_order_notifications_on_idempotency_key", unique: true
    t.index ["order_id", "kind", "recipient", "reference_key"], name: "index_order_notifications_on_delivery_identity", unique: true
    t.index ["order_id"], name: "index_order_notifications_on_order_id"
    t.index ["status", "created_at"], name: "index_order_notifications_on_status_and_created_at"
    t.check_constraint "attempts >= 0", name: "order_notifications_attempts_nonnegative"
    t.check_constraint "status::text = ANY (ARRAY['pending'::character varying, 'delivering'::character varying, 'sent'::character varying, 'suppressed'::character varying, 'failed'::character varying]::text[])", name: "order_notifications_status_valid"
  end

  create_table "order_refunds", force: :cascade do |t|
    t.integer "amount_cents", null: false
    t.datetime "created_at", null: false
    t.string "currency", limit: 3, null: false
    t.string "failure_reason"
    t.bigint "order_id", null: false
    t.datetime "processed_at"
    t.string "provider", default: "stripe", null: false
    t.string "provider_balance_transaction_id"
    t.string "provider_mode", null: false
    t.string "provider_refund_id"
    t.string "reason", null: false
    t.string "request_key", null: false
    t.datetime "requested_at", null: false
    t.bigint "requested_by_id"
    t.string "source", default: "admin", null: false
    t.text "staff_note"
    t.string "status", default: "pending_provider", null: false
    t.datetime "updated_at", null: false
    t.index ["order_id", "status"], name: "index_order_refunds_on_order_id_and_status"
    t.index ["order_id"], name: "index_order_refunds_on_order_id"
    t.index ["provider", "provider_refund_id"], name: "index_order_refunds_on_provider_and_provider_refund_id", unique: true, where: "(provider_refund_id IS NOT NULL)"
    t.index ["request_key"], name: "index_order_refunds_on_request_key", unique: true
    t.index ["requested_by_id"], name: "index_order_refunds_on_requested_by_id"
    t.check_constraint "amount_cents > 0", name: "order_refunds_amount_positive"
    t.check_constraint "source::text = ANY (ARRAY['admin'::character varying, 'stripe_dashboard'::character varying]::text[])", name: "order_refunds_source_valid"
    t.check_constraint "status::text = ANY (ARRAY['pending_provider'::character varying, 'pending'::character varying, 'requires_action'::character varying, 'succeeded'::character varying, 'failed'::character varying, 'canceled'::character varying, 'error'::character varying]::text[])", name: "order_refunds_status_valid"
  end

  create_table "orders", force: :cascade do |t|
    t.datetime "cancelled_at"
    t.string "checkout_key", null: false
    t.datetime "created_at", null: false
    t.string "currency", limit: 3, null: false
    t.string "customer_email", null: false
    t.string "customer_name", null: false
    t.string "customer_phone"
    t.string "fulfillment_method", null: false
    t.bigint "inventory_location_id", null: false
    t.datetime "last_reconciliation_attempt_at"
    t.datetime "last_reconciled_at"
    t.string "number", null: false
    t.bigint "organization_id", null: false
    t.datetime "paid_at"
    t.text "payment_error"
    t.datetime "payment_expires_at", null: false
    t.jsonb "shipping_address", default: {}, null: false
    t.string "shipping_carrier"
    t.integer "shipping_cents", default: 0, null: false
    t.bigint "shipping_quote_id"
    t.string "shipping_service"
    t.boolean "simulated", default: false, null: false
    t.string "status", default: "pending_payment", null: false
    t.string "stripe_checkout_session_id"
    t.text "stripe_checkout_url"
    t.string "stripe_payment_intent_id"
    t.integer "subtotal_cents", null: false
    t.integer "tax_cents", default: 0, null: false
    t.integer "total_cents", null: false
    t.datetime "updated_at", null: false
    t.index ["checkout_key"], name: "index_orders_on_checkout_key", unique: true
    t.index ["inventory_location_id"], name: "index_orders_on_inventory_location_id"
    t.index ["last_reconciliation_attempt_at"], name: "index_orders_on_last_reconciliation_attempt_at"
    t.index ["last_reconciled_at"], name: "index_orders_on_last_reconciled_at"
    t.index ["organization_id", "number"], name: "index_orders_on_organization_id_and_number", unique: true
    t.index ["organization_id", "status", "created_at"], name: "index_orders_on_organization_id_and_status_and_created_at"
    t.index ["organization_id"], name: "index_orders_on_organization_id"
    t.index ["shipping_quote_id"], name: "index_orders_on_shipping_quote_id"
    t.index ["stripe_checkout_session_id"], name: "index_orders_on_stripe_checkout_session_id", unique: true, where: "(stripe_checkout_session_id IS NOT NULL)"
    t.check_constraint "shipping_cents >= 0", name: "orders_shipping_nonnegative"
    t.check_constraint "subtotal_cents >= 0", name: "orders_subtotal_nonnegative"
    t.check_constraint "tax_cents >= 0", name: "orders_tax_nonnegative"
    t.check_constraint "total_cents = (subtotal_cents + shipping_cents + tax_cents)", name: "orders_total_matches_parts"
  end

  create_table "organizations", force: :cascade do |t|
    t.string "contact_email"
    t.datetime "created_at", null: false
    t.text "description"
    t.string "facebook_url"
    t.integer "founded_year"
    t.string "instagram_url"
    t.string "name"
    t.string "phone"
    t.string "primary_color"
    t.string "secondary_color"
    t.string "slug"
    t.datetime "updated_at", null: false
    t.string "website_url"
  end

  create_table "payment_events", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "event_type", null: false
    t.bigint "order_id"
    t.datetime "processed_at"
    t.text "processing_error"
    t.string "provider", default: "stripe", null: false
    t.string "provider_event_id", null: false
    t.string "status", default: "received", null: false
    t.datetime "updated_at", null: false
    t.index ["order_id"], name: "index_payment_events_on_order_id"
    t.index ["provider", "provider_event_id"], name: "index_payment_events_on_provider_and_provider_event_id", unique: true
    t.index ["status", "created_at"], name: "index_payment_events_on_status_and_created_at"
  end

  create_table "prize_categories", force: :cascade do |t|
    t.decimal "amount"
    t.datetime "created_at", null: false
    t.bigint "event_id", null: false
    t.string "name"
    t.integer "sort_order"
    t.string "translation_status", default: "untranslated", null: false
    t.jsonb "translations", default: {}, null: false
    t.datetime "updated_at", null: false
    t.index ["event_id"], name: "index_prize_categories_on_event_id"
    t.index ["translation_status"], name: "index_prize_categories_on_translation_status"
  end

  create_table "product_collection_memberships", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "product_collection_id", null: false
    t.bigint "product_id", null: false
    t.integer "sort_order", default: 0, null: false
    t.datetime "updated_at", null: false
    t.index ["product_collection_id", "product_id"], name: "idx_collection_memberships_unique", unique: true
    t.index ["product_id", "product_collection_id"], name: "idx_collection_memberships_product"
  end

  create_table "product_collections", force: :cascade do |t|
    t.boolean "active", default: false, null: false
    t.datetime "created_at", null: false
    t.text "description", default: "", null: false
    t.string "name", null: false
    t.bigint "organization_id", null: false
    t.string "slug", null: false
    t.integer "sort_order", default: 0, null: false
    t.datetime "updated_at", null: false
    t.index ["organization_id", "active", "sort_order"], name: "idx_on_organization_id_active_sort_order_798f226c88"
    t.index ["organization_id", "slug"], name: "index_product_collections_on_organization_id_and_slug", unique: true
    t.index ["organization_id"], name: "index_product_collections_on_organization_id"
  end

  create_table "product_images", force: :cascade do |t|
    t.string "alt_text", default: "", null: false
    t.datetime "created_at", null: false
    t.bigint "product_id", null: false
    t.bigint "product_variant_id"
    t.integer "sort_order", default: 0, null: false
    t.datetime "updated_at", null: false
    t.index ["product_id", "sort_order"], name: "index_product_images_on_product_id_and_sort_order"
    t.index ["product_id"], name: "index_product_images_on_product_id"
    t.index ["product_variant_id"], name: "index_product_images_on_product_variant_id"
  end

  create_table "product_option_values", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.integer "position", default: 0, null: false
    t.bigint "product_option_id", null: false
    t.datetime "updated_at", null: false
    t.string "value", null: false
    t.index ["product_option_id", "position"], name: "idx_product_option_values_position"
    t.index ["product_option_id", "value"], name: "idx_product_option_values_unique", unique: true
    t.index ["product_option_id"], name: "index_product_option_values_on_product_option_id"
  end

  create_table "product_options", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.integer "position", default: 0, null: false
    t.bigint "product_id", null: false
    t.datetime "updated_at", null: false
    t.index ["product_id", "name"], name: "index_product_options_on_product_id_and_name", unique: true
    t.index ["product_id", "position"], name: "index_product_options_on_product_id_and_position"
    t.index ["product_id"], name: "index_product_options_on_product_id"
  end

  create_table "product_variant_option_values", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "product_option_id", null: false
    t.bigint "product_option_value_id", null: false
    t.bigint "product_variant_id", null: false
    t.datetime "updated_at", null: false
    t.index ["product_option_value_id"], name: "idx_variant_option_values_value"
    t.index ["product_variant_id", "product_option_id"], name: "idx_variant_option_values_one_per_option", unique: true
    t.index ["product_variant_id", "product_option_value_id"], name: "idx_variant_option_values_unique", unique: true
  end

  create_table "product_variants", force: :cascade do |t|
    t.boolean "active", default: false, null: false
    t.boolean "allow_pickup", default: true, null: false
    t.boolean "allow_shipping", default: true, null: false
    t.integer "compare_at_price_cents"
    t.string "country_of_origin", limit: 2
    t.datetime "created_at", null: false
    t.string "currency", limit: 3, default: "USD", null: false
    t.string "customs_description"
    t.integer "height_mm"
    t.string "hts_code", limit: 12
    t.integer "length_mm"
    t.string "name", null: false
    t.integer "position", default: 0, null: false
    t.integer "price_cents", null: false
    t.bigint "product_id", null: false
    t.string "sku", null: false
    t.datetime "updated_at", null: false
    t.integer "weight_grams"
    t.integer "width_mm"
    t.index ["product_id", "active", "position"], name: "index_product_variants_on_product_id_and_active_and_position"
    t.index ["product_id"], name: "index_product_variants_on_product_id"
    t.index ["sku"], name: "index_product_variants_on_sku", unique: true
    t.check_constraint "compare_at_price_cents IS NULL OR compare_at_price_cents >= price_cents", name: "product_variants_compare_price_valid"
    t.check_constraint "height_mm IS NULL OR height_mm > 0", name: "product_variants_height_positive"
    t.check_constraint "length_mm IS NULL OR length_mm > 0", name: "product_variants_length_positive"
    t.check_constraint "price_cents >= 0", name: "product_variants_price_nonnegative"
    t.check_constraint "weight_grams IS NULL OR weight_grams > 0", name: "product_variants_weight_positive"
    t.check_constraint "width_mm IS NULL OR width_mm > 0", name: "product_variants_width_positive"
  end

  create_table "products", force: :cascade do |t|
    t.boolean "active", default: false, null: false
    t.datetime "created_at", null: false
    t.boolean "demo_only", default: false, null: false
    t.text "description", default: "", null: false
    t.boolean "featured", default: false, null: false
    t.string "name", null: false
    t.bigint "organization_id", null: false
    t.boolean "pickup_enabled", default: true, null: false
    t.boolean "shippable", default: true, null: false
    t.string "slug", null: false
    t.integer "sort_order", default: 0, null: false
    t.jsonb "translations", default: {}, null: false
    t.datetime "updated_at", null: false
    t.index ["organization_id", "active", "sort_order"], name: "index_products_on_organization_id_and_active_and_sort_order"
    t.index ["organization_id", "slug"], name: "index_products_on_organization_id_and_slug", unique: true
    t.index ["organization_id"], name: "index_products_on_organization_id"
  end

  create_table "shipment_events", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "event_type", null: false
    t.text "last_error"
    t.datetime "processed_at"
    t.string "provider", default: "easypost", null: false
    t.string "provider_event_id", null: false
    t.string "provider_object_id"
    t.bigint "shipment_id"
    t.string "status", default: "received", null: false
    t.datetime "updated_at", null: false
    t.index ["provider", "provider_event_id"], name: "index_shipment_events_on_provider_and_provider_event_id", unique: true
    t.index ["shipment_id"], name: "index_shipment_events_on_shipment_id"
    t.index ["status", "created_at"], name: "index_shipment_events_on_status_and_created_at"
    t.check_constraint "status::text = ANY (ARRAY['received'::character varying, 'processing'::character varying, 'processed'::character varying, 'ignored'::character varying, 'failed'::character varying]::text[])", name: "shipment_events_status_valid"
  end

  create_table "shipments", force: :cascade do |t|
    t.string "carrier", null: false
    t.datetime "created_at", null: false
    t.string "currency", limit: 3, default: "USD", null: false
    t.string "label_format"
    t.string "label_url"
    t.text "last_error"
    t.datetime "last_tracking_update_at"
    t.bigint "order_id", null: false
    t.integer "postage_cents"
    t.string "provider", default: "easypost", null: false
    t.string "provider_mode", null: false
    t.string "provider_rate_id", null: false
    t.string "provider_shipment_id", null: false
    t.string "provider_tracker_id"
    t.datetime "purchased_at"
    t.string "service", null: false
    t.bigint "shipping_quote_id", null: false
    t.string "status", default: "purchasing", null: false
    t.string "tracking_code"
    t.string "tracking_url"
    t.datetime "updated_at", null: false
    t.index ["order_id"], name: "index_shipments_on_order_id", unique: true
    t.index ["provider", "provider_shipment_id"], name: "index_shipments_on_provider_and_provider_shipment_id", unique: true
    t.index ["provider_tracker_id"], name: "index_shipments_on_provider_tracker_id", unique: true, where: "(provider_tracker_id IS NOT NULL)"
    t.index ["shipping_quote_id"], name: "index_shipments_on_shipping_quote_id"
    t.index ["status", "updated_at"], name: "index_shipments_on_status_and_updated_at"
    t.check_constraint "postage_cents IS NULL OR postage_cents >= 0", name: "shipments_postage_nonnegative"
    t.check_constraint "status::text = ANY (ARRAY['purchasing'::character varying, 'purchased'::character varying, 'unknown'::character varying, 'pre_transit'::character varying, 'in_transit'::character varying, 'out_for_delivery'::character varying, 'delivered'::character varying, 'available_for_pickup'::character varying, 'return_to_sender'::character varying, 'failure'::character varying, 'cancelled'::character varying, 'error'::character varying]::text[])", name: "shipments_status_valid"
  end

  create_table "shipping_packages", force: :cascade do |t|
    t.boolean "active", default: true, null: false
    t.datetime "created_at", null: false
    t.boolean "demo_only", default: false, null: false
    t.integer "empty_weight_grams", default: 0, null: false
    t.integer "height_mm", null: false
    t.integer "length_mm", null: false
    t.integer "max_weight_grams", null: false
    t.string "name", null: false
    t.bigint "organization_id", null: false
    t.integer "sort_order", default: 0, null: false
    t.datetime "updated_at", null: false
    t.integer "width_mm", null: false
    t.index ["organization_id", "active", "sort_order"], name: "idx_on_organization_id_active_sort_order_90fcaae19c"
    t.index ["organization_id", "name"], name: "index_shipping_packages_on_organization_id_and_name", unique: true
    t.index ["organization_id"], name: "index_shipping_packages_on_organization_id"
    t.check_constraint "empty_weight_grams >= 0", name: "shipping_packages_empty_weight_nonnegative"
    t.check_constraint "height_mm > 0", name: "shipping_packages_height_positive"
    t.check_constraint "length_mm > 0", name: "shipping_packages_length_positive"
    t.check_constraint "max_weight_grams > 0", name: "shipping_packages_max_weight_positive"
    t.check_constraint "width_mm > 0", name: "shipping_packages_width_positive"
  end

  create_table "shipping_quotes", force: :cascade do |t|
    t.integer "amount_cents", null: false
    t.string "carrier", null: false
    t.string "cart_digest", null: false
    t.datetime "created_at", null: false
    t.string "currency", limit: 3, null: false
    t.datetime "delivery_date"
    t.integer "delivery_days"
    t.string "destination_digest", null: false
    t.datetime "expires_at", null: false
    t.bigint "inventory_location_id", null: false
    t.bigint "organization_id", null: false
    t.string "provider", default: "easypost", null: false
    t.string "provider_rate_id", null: false
    t.string "provider_shipment_id", null: false
    t.string "service", null: false
    t.bigint "shipping_package_id", null: false
    t.datetime "updated_at", null: false
    t.index ["expires_at"], name: "index_shipping_quotes_on_expires_at"
    t.index ["inventory_location_id"], name: "index_shipping_quotes_on_inventory_location_id"
    t.index ["organization_id"], name: "index_shipping_quotes_on_organization_id"
    t.index ["provider_rate_id"], name: "index_shipping_quotes_on_provider_rate_id", unique: true
    t.index ["shipping_package_id"], name: "index_shipping_quotes_on_shipping_package_id"
    t.check_constraint "amount_cents >= 0", name: "shipping_quotes_amount_nonnegative"
  end

  create_table "site_contents", force: :cascade do |t|
    t.string "content_type", default: "text"
    t.datetime "created_at", null: false
    t.string "key", null: false
    t.string "label"
    t.string "section"
    t.integer "sort_order", default: 0
    t.string "translation_status", default: "pending", null: false
    t.datetime "updated_at", null: false
    t.text "value_en"
    t.text "value_ja"
    t.text "value_ko"
    t.text "value_pt"
    t.text "value_tl"
    t.text "value_zh"
    t.text "value_zh_hant"
    t.index ["key"], name: "index_site_contents_on_key", unique: true
    t.index ["section"], name: "index_site_contents_on_section"
  end

  create_table "site_images", force: :cascade do |t|
    t.boolean "active", default: true
    t.string "alt_text"
    t.string "caption"
    t.datetime "created_at", null: false
    t.string "placement", null: false
    t.integer "sort_order", default: 0
    t.string "title"
    t.datetime "updated_at", null: false
    t.index ["placement", "sort_order"], name: "index_site_images_on_placement_and_sort_order"
    t.index ["placement"], name: "index_site_images_on_placement"
  end

  create_table "solid_queue_blocked_executions", force: :cascade do |t|
    t.string "concurrency_key", null: false
    t.datetime "created_at", null: false
    t.datetime "expires_at", null: false
    t.bigint "job_id", null: false
    t.integer "priority", default: 0, null: false
    t.string "queue_name", null: false
    t.index ["concurrency_key", "priority", "job_id"], name: "index_solid_queue_blocked_executions_for_release"
    t.index ["expires_at", "concurrency_key"], name: "index_solid_queue_blocked_executions_for_maintenance"
    t.index ["job_id"], name: "index_solid_queue_blocked_executions_on_job_id", unique: true
  end

  create_table "solid_queue_claimed_executions", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "job_id", null: false
    t.bigint "process_id"
    t.index ["job_id"], name: "index_solid_queue_claimed_executions_on_job_id", unique: true
    t.index ["process_id", "job_id"], name: "index_solid_queue_claimed_executions_on_process_id_and_job_id"
  end

  create_table "solid_queue_failed_executions", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.text "error"
    t.bigint "job_id", null: false
    t.index ["job_id"], name: "index_solid_queue_failed_executions_on_job_id", unique: true
  end

  create_table "solid_queue_jobs", force: :cascade do |t|
    t.string "active_job_id"
    t.text "arguments"
    t.string "class_name", null: false
    t.string "concurrency_key"
    t.datetime "created_at", null: false
    t.datetime "finished_at"
    t.integer "priority", default: 0, null: false
    t.string "queue_name", null: false
    t.datetime "scheduled_at"
    t.datetime "updated_at", null: false
    t.index ["active_job_id"], name: "index_solid_queue_jobs_on_active_job_id"
    t.index ["class_name"], name: "index_solid_queue_jobs_on_class_name"
    t.index ["finished_at"], name: "index_solid_queue_jobs_on_finished_at"
    t.index ["queue_name", "finished_at"], name: "index_solid_queue_jobs_for_filtering"
    t.index ["scheduled_at", "finished_at"], name: "index_solid_queue_jobs_for_alerting"
  end

  create_table "solid_queue_pauses", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "queue_name", null: false
    t.index ["queue_name"], name: "index_solid_queue_pauses_on_queue_name", unique: true
  end

  create_table "solid_queue_processes", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "hostname"
    t.string "kind", null: false
    t.datetime "last_heartbeat_at", null: false
    t.text "metadata"
    t.string "name", null: false
    t.integer "pid", null: false
    t.bigint "supervisor_id"
    t.index ["last_heartbeat_at"], name: "index_solid_queue_processes_on_last_heartbeat_at"
    t.index ["name", "supervisor_id"], name: "index_solid_queue_processes_on_name_and_supervisor_id", unique: true
    t.index ["supervisor_id"], name: "index_solid_queue_processes_on_supervisor_id"
  end

  create_table "solid_queue_ready_executions", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "job_id", null: false
    t.integer "priority", default: 0, null: false
    t.string "queue_name", null: false
    t.index ["job_id"], name: "index_solid_queue_ready_executions_on_job_id", unique: true
    t.index ["priority", "job_id"], name: "index_solid_queue_poll_all"
    t.index ["queue_name", "priority", "job_id"], name: "index_solid_queue_poll_by_queue"
  end

  create_table "solid_queue_recurring_executions", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "job_id", null: false
    t.datetime "run_at", null: false
    t.string "task_key", null: false
    t.index ["job_id"], name: "index_solid_queue_recurring_executions_on_job_id", unique: true
    t.index ["task_key", "run_at"], name: "index_solid_queue_recurring_executions_on_task_key_and_run_at", unique: true
  end

  create_table "solid_queue_recurring_tasks", force: :cascade do |t|
    t.text "arguments"
    t.string "class_name"
    t.string "command", limit: 2048
    t.datetime "created_at", null: false
    t.text "description"
    t.string "key", null: false
    t.integer "priority", default: 0
    t.string "queue_name"
    t.string "schedule", null: false
    t.boolean "static", default: true, null: false
    t.datetime "updated_at", null: false
    t.index ["key"], name: "index_solid_queue_recurring_tasks_on_key", unique: true
    t.index ["static"], name: "index_solid_queue_recurring_tasks_on_static"
  end

  create_table "solid_queue_scheduled_executions", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "job_id", null: false
    t.integer "priority", default: 0, null: false
    t.string "queue_name", null: false
    t.datetime "scheduled_at", null: false
    t.index ["job_id"], name: "index_solid_queue_scheduled_executions_on_job_id", unique: true
    t.index ["scheduled_at", "priority", "job_id"], name: "index_solid_queue_dispatch_all"
  end

  create_table "solid_queue_semaphores", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "expires_at", null: false
    t.string "key", null: false
    t.datetime "updated_at", null: false
    t.integer "value", default: 1, null: false
    t.index ["expires_at"], name: "index_solid_queue_semaphores_on_expires_at"
    t.index ["key", "value"], name: "index_solid_queue_semaphores_on_key_and_value"
    t.index ["key"], name: "index_solid_queue_semaphores_on_key", unique: true
  end

  create_table "sponsors", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "name"
    t.bigint "organization_id", null: false
    t.integer "sort_order"
    t.string "tier"
    t.datetime "updated_at", null: false
    t.string "website_url"
    t.index ["organization_id"], name: "index_sponsors_on_organization_id"
  end

  create_table "users", force: :cascade do |t|
    t.string "clerk_id", null: false
    t.string "clerk_invitation_id"
    t.datetime "created_at", null: false
    t.string "email", null: false
    t.string "first_name"
    t.string "invitation_status", default: "accepted", null: false
    t.datetime "invited_at"
    t.bigint "invited_by_id"
    t.string "last_name"
    t.string "role", default: "viewer", null: false
    t.datetime "updated_at", null: false
    t.index ["clerk_id"], name: "index_users_on_clerk_id", unique: true
    t.index ["clerk_invitation_id"], name: "index_users_on_clerk_invitation_id", unique: true, where: "(clerk_invitation_id IS NOT NULL)"
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["invitation_status"], name: "index_users_on_invitation_status"
  end

  create_table "videos", force: :cascade do |t|
    t.string "belt_rank"
    t.string "category"
    t.string "competitor_1_name"
    t.string "competitor_2_name"
    t.datetime "created_at", null: false
    t.integer "duration_seconds"
    t.bigint "event_id"
    t.boolean "featured", default: false
    t.string "result"
    t.string "round"
    t.integer "sort_order", default: 0
    t.string "status", default: "published"
    t.string "title", null: false
    t.datetime "updated_at", null: false
    t.string "weight_class"
    t.string "youtube_url", null: false
    t.string "youtube_video_id"
    t.index ["event_id"], name: "index_videos_on_event_id"
    t.index ["featured"], name: "index_videos_on_featured"
    t.index ["youtube_video_id"], name: "index_videos_on_youtube_video_id"
  end

  add_foreign_key "active_storage_attachments", "active_storage_blobs", column: "blob_id"
  add_foreign_key "active_storage_variant_records", "active_storage_blobs", column: "blob_id"
  add_foreign_key "commerce_launch_checks", "organizations"
  add_foreign_key "commerce_launch_checks", "users", column: "reviewed_by_id"
  add_foreign_key "competitors", "academies"
  add_foreign_key "event_accommodations", "events"
  add_foreign_key "event_gallery_images", "event_gallery_upload_batches"
  add_foreign_key "event_gallery_images", "events"
  add_foreign_key "event_gallery_upload_batches", "events"
  add_foreign_key "event_results", "competitors"
  add_foreign_key "event_results", "events"
  add_foreign_key "event_schedule_items", "events"
  add_foreign_key "events", "organizations"
  add_foreign_key "fulfillments", "orders"
  add_foreign_key "fulfillments", "users", column: "updated_by_id"
  add_foreign_key "inventory_levels", "inventory_locations"
  add_foreign_key "inventory_levels", "product_variants"
  add_foreign_key "inventory_locations", "organizations"
  add_foreign_key "inventory_movements", "inventory_locations"
  add_foreign_key "inventory_movements", "product_variants"
  add_foreign_key "inventory_movements", "users", column: "performed_by_id"
  add_foreign_key "inventory_reservations", "inventory_locations"
  add_foreign_key "inventory_reservations", "orders"
  add_foreign_key "inventory_reservations", "product_variants"
  add_foreign_key "order_items", "orders"
  add_foreign_key "order_items", "product_variants"
  add_foreign_key "order_items", "products"
  add_foreign_key "order_notifications", "orders"
  add_foreign_key "order_refunds", "orders"
  add_foreign_key "order_refunds", "users", column: "requested_by_id"
  add_foreign_key "orders", "inventory_locations"
  add_foreign_key "orders", "organizations"
  add_foreign_key "orders", "shipping_quotes"
  add_foreign_key "payment_events", "orders"
  add_foreign_key "prize_categories", "events"
  add_foreign_key "product_collection_memberships", "product_collections"
  add_foreign_key "product_collection_memberships", "products"
  add_foreign_key "product_collections", "organizations"
  add_foreign_key "product_images", "product_variants"
  add_foreign_key "product_images", "products"
  add_foreign_key "product_option_values", "product_options"
  add_foreign_key "product_options", "products"
  add_foreign_key "product_variant_option_values", "product_option_values"
  add_foreign_key "product_variant_option_values", "product_options"
  add_foreign_key "product_variant_option_values", "product_variants"
  add_foreign_key "product_variants", "products"
  add_foreign_key "products", "organizations"
  add_foreign_key "shipment_events", "shipments"
  add_foreign_key "shipments", "orders"
  add_foreign_key "shipments", "shipping_quotes"
  add_foreign_key "shipping_packages", "organizations"
  add_foreign_key "shipping_quotes", "inventory_locations"
  add_foreign_key "shipping_quotes", "organizations"
  add_foreign_key "shipping_quotes", "shipping_packages"
  add_foreign_key "solid_queue_blocked_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "solid_queue_claimed_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "solid_queue_failed_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "solid_queue_ready_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "solid_queue_recurring_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "solid_queue_scheduled_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "sponsors", "organizations"
  add_foreign_key "users", "users", column: "invited_by_id", on_delete: :nullify
  add_foreign_key "videos", "events"
end
