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

ActiveRecord::Schema[8.1].define(version: 2026_05_08_002000) do
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
    t.integer "width"
    t.index ["event_gallery_upload_batch_id"], name: "index_event_gallery_images_on_upload_batch_id"
    t.index ["event_id", "active"], name: "index_event_gallery_images_on_event_id_and_active"
    t.index ["event_id", "sort_order"], name: "index_event_gallery_images_on_event_id_and_sort_order"
    t.index ["event_id", "status"], name: "index_event_gallery_images_on_event_id_and_status"
    t.index ["event_id"], name: "index_event_gallery_images_on_event_id"
    t.index ["processing_token"], name: "index_event_gallery_images_on_processing_token"
    t.index ["status", "processing_started_at"], name: "index_event_gallery_images_on_status_and_processing_started_at"
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
  add_foreign_key "competitors", "academies"
  add_foreign_key "event_accommodations", "events"
  add_foreign_key "event_gallery_images", "event_gallery_upload_batches"
  add_foreign_key "event_gallery_images", "events"
  add_foreign_key "event_gallery_upload_batches", "events"
  add_foreign_key "event_results", "competitors"
  add_foreign_key "event_results", "events"
  add_foreign_key "event_schedule_items", "events"
  add_foreign_key "events", "organizations"
  add_foreign_key "prize_categories", "events"
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
