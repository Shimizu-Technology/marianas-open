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

ActiveRecord::Schema[8.1].define(version: 2026_03_25_031719) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

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

  create_table "competitors", force: :cascade do |t|
    t.string "academy"
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
    t.string "caption"
    t.datetime "created_at", null: false
    t.bigint "event_id", null: false
    t.integer "sort_order", default: 0, null: false
    t.string "title"
    t.datetime "updated_at", null: false
    t.index ["event_id", "active"], name: "index_event_gallery_images_on_event_id_and_active"
    t.index ["event_id", "sort_order"], name: "index_event_gallery_images_on_event_id_and_sort_order"
    t.index ["event_id"], name: "index_event_gallery_images_on_event_id"
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
    t.text "schedule_note"
    t.string "slug"
    t.string "status"
    t.string "tagline"
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

  create_table "site_contents", force: :cascade do |t|
    t.string "content_type", default: "text"
    t.datetime "created_at", null: false
    t.string "key", null: false
    t.string "label"
    t.string "section"
    t.integer "sort_order", default: 0
    t.string "translation_status", default: "translated", null: false
    t.datetime "updated_at", null: false
    t.text "value_en"
    t.text "value_ja"
    t.text "value_ko"
    t.text "value_pt"
    t.text "value_tl"
    t.text "value_zh"
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
  add_foreign_key "event_accommodations", "events"
  add_foreign_key "event_gallery_images", "events"
  add_foreign_key "event_results", "competitors"
  add_foreign_key "event_results", "events"
  add_foreign_key "event_schedule_items", "events"
  add_foreign_key "events", "organizations"
  add_foreign_key "prize_categories", "events"
  add_foreign_key "sponsors", "organizations"
  add_foreign_key "users", "users", column: "invited_by_id", on_delete: :nullify
  add_foreign_key "videos", "events"
end
