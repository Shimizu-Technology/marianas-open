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

ActiveRecord::Schema[8.1].define(version: 2026_11_03_100000) do
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
    t.string "normalized_name"
    t.bigint "parent_id"
    t.string "slug", null: false
    t.boolean "unaffiliated", default: false, null: false
    t.datetime "updated_at", null: false
    t.string "website_url"
    t.index ["aliases"], name: "index_academies_on_aliases", using: :gin
    t.index ["country_code"], name: "index_academies_on_country_code"
    t.index ["normalized_name"], name: "index_academies_on_normalized_name"
    t.index ["parent_id"], name: "index_academies_on_parent_id"
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

  create_table "asjjf_calendar_reviews", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "event_id"
    t.string "fingerprint", null: false
    t.string "kind", null: false
    t.jsonb "new_values", default: {}, null: false
    t.jsonb "old_values", default: {}, null: false
    t.datetime "reviewed_at"
    t.bigint "snapshot_id", null: false
    t.string "status", default: "pending", null: false
    t.string "title", null: false
    t.datetime "updated_at", null: false
    t.index ["event_id"], name: "index_asjjf_calendar_reviews_on_event_id"
    t.index ["fingerprint"], name: "index_asjjf_calendar_reviews_on_fingerprint", unique: true
    t.index ["snapshot_id"], name: "index_asjjf_calendar_reviews_on_snapshot_id"
    t.index ["status", "id"], name: "index_asjjf_calendar_reviews_on_status_and_id"
  end

  create_table "asjjf_calendar_runs", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.integer "season_id", null: false
    t.integer "season_year"
    t.bigint "snapshot_id", null: false
    t.jsonb "summary", default: {}, null: false
    t.datetime "updated_at", null: false
    t.index ["snapshot_id"], name: "index_asjjf_calendar_runs_on_snapshot_id", unique: true
  end

  create_table "asjjf_fetch_requests", force: :cascade do |t|
    t.integer "attempts", default: 0, null: false
    t.datetime "completed_at"
    t.datetime "created_at", null: false
    t.boolean "include_divisions", default: false, null: false
    t.text "last_error"
    t.datetime "lease_expires_at"
    t.string "lease_token"
    t.string "leased_by"
    t.string "page_type", null: false
    t.integer "priority", default: 0, null: false
    t.text "reason"
    t.string "requested_by"
    t.bigint "snapshot_id"
    t.string "status", default: "pending", null: false
    t.datetime "updated_at", null: false
    t.text "url", null: false
    t.index ["lease_expires_at"], name: "index_asjjf_fetch_requests_on_lease_expires_at"
    t.index ["snapshot_id"], name: "index_asjjf_fetch_requests_on_snapshot_id"
    t.index ["status", "priority", "created_at"], name: "index_asjjf_requests_for_leasing"
    t.index ["url"], name: "index_asjjf_requests_active_url", unique: true, where: "((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('leased'::character varying)::text]))"
  end

  create_table "asjjf_fetcher_heartbeats", force: :cascade do |t|
    t.integer "challenged", default: 0, null: false
    t.datetime "created_at", null: false
    t.integer "error_count", default: 0, null: false
    t.integer "fetched", default: 0, null: false
    t.string "fetcher_id", null: false
    t.string "fetcher_version"
    t.integer "rate_count", default: 0, null: false
    t.datetime "rate_window_started_at"
    t.datetime "received_at"
    t.datetime "run_finished_at"
    t.datetime "run_started_at"
    t.datetime "updated_at", null: false
    t.index ["fetcher_id"], name: "index_asjjf_fetcher_heartbeats_on_fetcher_id", unique: true
  end

  create_table "asjjf_fetcher_rate_limits", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "credential_digest", null: false
    t.integer "request_count", default: 0, null: false
    t.datetime "updated_at", null: false
    t.datetime "window_started_at"
    t.index ["credential_digest"], name: "index_asjjf_fetcher_rate_limits_on_credential_digest", unique: true
  end

  create_table "asjjf_ranking_divisions", force: :cascade do |t|
    t.string "age_group", null: false
    t.bigint "asjjf_division_id", null: false
    t.bigint "asjjf_ranking_list_id", null: false
    t.string "belt", null: false
    t.datetime "created_at", null: false
    t.string "gender", null: false
    t.string "label", null: false
    t.datetime "last_synced_at"
    t.integer "position", null: false
    t.bigint "source_snapshot_id"
    t.string "status", default: "pending", null: false
    t.datetime "updated_at", null: false
    t.index ["asjjf_ranking_list_id", "asjjf_division_id"], name: "idx_ranking_division_identity", unique: true
    t.index ["asjjf_ranking_list_id"], name: "index_asjjf_ranking_divisions_on_asjjf_ranking_list_id"
    t.index ["source_snapshot_id"], name: "index_asjjf_ranking_divisions_on_source_snapshot_id"
  end

  create_table "asjjf_ranking_entries", force: :cascade do |t|
    t.bigint "academy_id"
    t.string "academy_name"
    t.bigint "asjjf_ranking_division_id"
    t.bigint "asjjf_ranking_list_id", null: false
    t.integer "bronze"
    t.bigint "competitor_id"
    t.string "country_code"
    t.datetime "created_at", null: false
    t.integer "gold"
    t.string "name", null: false
    t.decimal "points", precision: 14, scale: 3, null: false
    t.integer "position", null: false
    t.string "raw_country_code"
    t.integer "silver"
    t.bigint "source_snapshot_id"
    t.datetime "updated_at", null: false
    t.index ["academy_id"], name: "index_asjjf_ranking_entries_on_academy_id"
    t.index ["asjjf_ranking_division_id", "position"], name: "idx_ranking_entry_order"
    t.index ["asjjf_ranking_division_id"], name: "index_asjjf_ranking_entries_on_asjjf_ranking_division_id"
    t.index ["asjjf_ranking_list_id"], name: "index_asjjf_ranking_entries_on_asjjf_ranking_list_id"
    t.index ["competitor_id"], name: "index_asjjf_ranking_entries_on_competitor_id"
    t.index ["source_snapshot_id"], name: "index_asjjf_ranking_entries_on_source_snapshot_id"
  end

  create_table "asjjf_ranking_lists", force: :cascade do |t|
    t.bigint "asjjf_ranking_id", null: false
    t.bigint "asjjf_ranking_season_id", null: false
    t.string "category", default: "adult", null: false
    t.string "circuit", default: "Marianas Pro", null: false
    t.datetime "created_at", null: false
    t.string "discipline", null: false
    t.string "kind", null: false
    t.datetime "last_synced_at"
    t.integer "season_year", null: false
    t.bigint "source_snapshot_id"
    t.string "status", default: "pending", null: false
    t.string "title", null: false
    t.datetime "updated_at", null: false
    t.index ["asjjf_ranking_season_id", "discipline", "kind", "category"], name: "idx_ranking_list_identity", unique: true
    t.index ["asjjf_ranking_season_id"], name: "index_asjjf_ranking_lists_on_asjjf_ranking_season_id"
    t.index ["source_snapshot_id"], name: "index_asjjf_ranking_lists_on_source_snapshot_id"
  end

  create_table "asjjf_ranking_seasons", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.boolean "current", default: false, null: false
    t.bigint "gi_ranking_id"
    t.datetime "last_planned_at"
    t.datetime "last_results_imported_at"
    t.bigint "nogi_ranking_id"
    t.integer "season_year", null: false
    t.bigint "team_nogi_ranking_id"
    t.bigint "team_ranking_id"
    t.datetime "updated_at", null: false
    t.index ["current"], name: "index_asjjf_ranking_seasons_on_current", unique: true, where: "(current = true)"
    t.index ["season_year"], name: "index_asjjf_ranking_seasons_on_season_year", unique: true
  end

  create_table "asjjf_ranking_suggestions", force: :cascade do |t|
    t.bigint "asjjf_ranking_id", null: false
    t.datetime "created_at", null: false
    t.string "discipline", null: false
    t.string "kind", null: false
    t.integer "season_year", null: false
    t.bigint "source_snapshot_id"
    t.string "source_url", null: false
    t.string "title", null: false
    t.datetime "updated_at", null: false
    t.index ["asjjf_ranking_id", "kind"], name: "index_asjjf_ranking_suggestions_on_asjjf_ranking_id_and_kind", unique: true
    t.index ["source_snapshot_id"], name: "index_asjjf_ranking_suggestions_on_source_snapshot_id"
  end

  create_table "asjjf_settings", force: :cascade do |t|
    t.datetime "alerted_at"
    t.datetime "created_at", null: false
    t.string "key", null: false
    t.datetime "paused_until"
    t.text "reason"
    t.datetime "updated_at", null: false
    t.index ["key"], name: "index_asjjf_settings_on_key", unique: true
  end

  create_table "asjjf_snapshots", force: :cascade do |t|
    t.bigint "asjjf_id"
    t.integer "byte_size", null: false
    t.binary "compressed_html", null: false
    t.datetime "created_at", null: false
    t.datetime "fetched_at", null: false
    t.string "fetcher_id"
    t.text "final_url"
    t.integer "http_status"
    t.string "outcome", null: false
    t.string "page_type", null: false
    t.jsonb "params", default: {}, null: false
    t.text "parse_error"
    t.string "parse_status", default: "pending", null: false
    t.datetime "parsed_at"
    t.jsonb "parsed_summary", default: {}, null: false
    t.datetime "ranking_applied_at"
    t.text "ranking_apply_error"
    t.string "ranking_apply_status"
    t.string "sha256", null: false
    t.string "source", null: false
    t.datetime "updated_at", null: false
    t.bigint "uploaded_by_user_id"
    t.text "url", null: false
    t.index ["parse_status", "created_at"], name: "index_asjjf_snapshots_on_parse_status_and_created_at"
    t.index ["uploaded_by_user_id"], name: "index_asjjf_snapshots_on_uploaded_by_user_id"
    t.index ["url", "fetched_at"], name: "index_asjjf_snapshots_on_url_and_fetched_at"
  end

  create_table "competitor_aliases", force: :cascade do |t|
    t.bigint "competitor_id", null: false
    t.datetime "created_at", null: false
    t.bigint "created_by_id"
    t.string "normalized_key", null: false
    t.string "raw_name", null: false
    t.string "source", null: false
    t.datetime "updated_at", null: false
    t.index ["competitor_id"], name: "index_competitor_aliases_on_competitor_id"
    t.index ["created_by_id"], name: "index_competitor_aliases_on_created_by_id"
    t.index ["normalized_key"], name: "index_competitor_aliases_on_normalized_key", unique: true
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
    t.boolean "identity_separate", default: false, null: false
    t.string "instagram_url"
    t.string "last_name", null: false
    t.integer "losses", default: 0, null: false
    t.string "nickname"
    t.string "normalized_name"
    t.string "reverse_normalized_name"
    t.integer "silver_medals", default: 0, null: false
    t.datetime "updated_at", null: false
    t.string "weight_class"
    t.integer "wins", default: 0, null: false
    t.string "youtube_url"
    t.index ["academy_id"], name: "index_competitors_on_academy_id"
    t.index ["belt_rank"], name: "index_competitors_on_belt_rank"
    t.index ["country_code"], name: "index_competitors_on_country_code"
    t.index ["normalized_name"], name: "index_competitors_on_normalized_name"
    t.index ["reverse_normalized_name"], name: "index_competitors_on_reverse_normalized_name"
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

  create_table "event_asjjf_sources", force: :cascade do |t|
    t.bigint "asjjf_event_id", null: false
    t.datetime "created_at", null: false
    t.string "derived_from", null: false
    t.string "discipline", default: "unknown", null: false
    t.bigint "event_id", null: false
    t.datetime "updated_at", null: false
    t.index ["event_id", "asjjf_event_id"], name: "index_event_asjjf_sources_on_event_id_and_asjjf_event_id", unique: true
    t.index ["event_id"], name: "index_event_asjjf_sources_on_event_id"
  end

  create_table "event_audit_entries", force: :cascade do |t|
    t.string "action", null: false
    t.bigint "actor_id"
    t.string "actor_name", null: false
    t.datetime "created_at", null: false
    t.bigint "event_id", null: false
    t.string "from_status"
    t.jsonb "metadata", default: {}, null: false
    t.text "reason"
    t.string "to_status"
    t.datetime "updated_at", null: false
    t.index ["actor_id"], name: "index_event_audit_entries_on_actor_id"
    t.index ["event_id"], name: "index_event_audit_entries_on_event_id"
  end

  create_table "event_gallery_albums", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "event_id", null: false
    t.string "name", limit: 80, null: false
    t.integer "sort_order", default: 0, null: false
    t.datetime "updated_at", null: false
    t.index ["event_id", "name"], name: "index_event_gallery_albums_on_event_id_and_name", unique: true
    t.index ["event_id"], name: "index_event_gallery_albums_on_event_id"
  end

  create_table "event_gallery_images", force: :cascade do |t|
    t.boolean "active", default: true, null: false
    t.string "album_type"
    t.string "alt_text"
    t.bigint "byte_size"
    t.string "caption"
    t.string "capture_source"
    t.string "capture_timezone"
    t.datetime "captured_at"
    t.string "category"
    t.string "content_sha256"
    t.string "content_type"
    t.datetime "created_at", null: false
    t.bigint "event_gallery_import_id"
    t.bigint "event_gallery_upload_batch_id"
    t.bigint "event_id", null: false
    t.integer "height"
    t.string "original_filename"
    t.string "perceptual_hash"
    t.datetime "processed_at"
    t.text "processing_error"
    t.integer "processing_requeue_count", default: 0, null: false
    t.datetime "processing_started_at"
    t.string "processing_token"
    t.string "proposal_base_category"
    t.datetime "review_analyzed_at"
    t.jsonb "review_flags", default: [], null: false
    t.boolean "review_held", default: false, null: false
    t.datetime "reviewed_at"
    t.integer "sort_order", default: 0, null: false
    t.string "status", default: "ready", null: false
    t.string "title"
    t.datetime "updated_at", null: false
    t.integer "vips_variant_repair_attempts", default: 0, null: false
    t.datetime "vips_variants_repaired_at"
    t.integer "width"
    t.index ["event_gallery_import_id"], name: "index_event_gallery_images_on_event_gallery_import_id"
    t.index ["event_gallery_upload_batch_id"], name: "index_event_gallery_images_on_upload_batch_id"
    t.index ["event_id", "active"], name: "index_event_gallery_images_on_event_id_and_active"
    t.index ["event_id", "category", "sort_order"], name: "index_event_gallery_images_on_event_category_sort"
    t.index ["event_id", "content_sha256"], name: "gallery_images_event_content_hash", where: "(content_sha256 IS NOT NULL)"
    t.index ["event_id", "sort_order"], name: "index_event_gallery_images_on_event_id_and_sort_order"
    t.index ["event_id", "status"], name: "index_event_gallery_images_on_event_id_and_status"
    t.index ["event_id"], name: "index_event_gallery_images_on_event_id"
    t.index ["processing_token"], name: "index_event_gallery_images_on_processing_token"
    t.index ["status", "processing_started_at"], name: "index_event_gallery_images_on_status_and_processing_started_at"
    t.index ["status", "vips_variants_repaired_at", "vips_variant_repair_attempts"], name: "index_event_gallery_images_on_vips_variant_repair"
  end

  create_table "event_gallery_import_entries", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.integer "entry_index", null: false
    t.bigint "event_gallery_image_id"
    t.bigint "event_gallery_import_id", null: false
    t.string "outcome", null: false
    t.datetime "updated_at", null: false
    t.index ["event_gallery_image_id"], name: "index_event_gallery_import_entries_on_event_gallery_image_id"
    t.index ["event_gallery_import_id", "entry_index"], name: "gallery_import_entries_position", unique: true
  end

  create_table "event_gallery_imports", force: :cascade do |t|
    t.string "album_type", null: false
    t.string "category"
    t.datetime "completed_at"
    t.datetime "created_at", null: false
    t.jsonb "entry_errors", default: [], null: false
    t.bigint "event_id", null: false
    t.string "filename", null: false
    t.boolean "hold_flagged", default: false, null: false
    t.integer "imported_count", default: 0, null: false
    t.bigint "prepared_by_id", null: false
    t.integer "processed_entries", default: 0, null: false
    t.integer "skipped_count", default: 0, null: false
    t.bigint "source_blob_id", null: false
    t.string "status", default: "queued", null: false
    t.string "timezone", null: false
    t.integer "total_entries", default: 0, null: false
    t.datetime "updated_at", null: false
    t.index ["event_id", "source_blob_id"], name: "index_event_gallery_imports_on_event_id_and_source_blob_id", unique: true
    t.index ["event_id"], name: "index_event_gallery_imports_on_event_id"
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
    t.bigint "academy_id"
    t.string "age_category"
    t.boolean "alone_in_bracket"
    t.bigint "asjjf_event_id"
    t.string "belt_rank"
    t.bigint "competitor_id"
    t.string "competitor_name", null: false
    t.string "country_code"
    t.datetime "created_at", null: false
    t.string "discipline"
    t.string "division", null: false
    t.string "division_key"
    t.bigint "event_id", null: false
    t.string "gender"
    t.datetime "manually_edited_at"
    t.text "notes"
    t.integer "placement", null: false
    t.string "raw_competitor_name"
    t.string "source", default: "manual", null: false
    t.string "submission_method"
    t.jsonb "sync_key"
    t.datetime "updated_at", null: false
    t.string "weight_class"
    t.index ["academy_id"], name: "index_event_results_on_academy_id"
    t.index ["competitor_id"], name: "index_event_results_on_competitor_id"
    t.index ["competitor_name"], name: "index_event_results_on_competitor_name"
    t.index ["event_id", "belt_rank"], name: "index_event_results_on_event_id_and_belt_rank"
    t.index ["event_id", "division"], name: "index_event_results_on_event_id_and_division"
    t.index ["event_id", "source", "asjjf_event_id"], name: "index_event_results_on_sync_source"
    t.index ["event_id"], name: "index_event_results_on_event_id"
    t.check_constraint "discipline IS NULL OR (discipline::text = ANY (ARRAY['gi'::character varying::text, 'nogi'::character varying::text]))", name: "event_results_discipline"
    t.check_constraint "source::text = ANY (ARRAY['manual'::character varying::text, 'asjjf'::character varying::text])", name: "event_results_source"
  end

  create_table "event_schedule_items", force: :cascade do |t|
    t.boolean "confirmed", default: true, null: false
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
    t.bigint "asjjf_calendar_snapshot_id"
    t.jsonb "asjjf_event_ids", default: []
    t.bigint "asjjf_info_id"
    t.bigint "asjjf_info_snapshot_id"
    t.string "asjjf_info_status"
    t.integer "asjjf_stars"
    t.string "city"
    t.boolean "content_review_required", default: false, null: false
    t.string "country"
    t.string "country_code"
    t.datetime "created_at", null: false
    t.date "date"
    t.text "description"
    t.date "end_date"
    t.boolean "gallery_hold_flagged", default: false, null: false
    t.string "gallery_timezone", default: "Pacific/Guam", null: false
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
    t.boolean "registration_not_open", default: false, null: false
    t.date "registration_opens_on"
    t.jsonb "registration_steps", default: [], null: false
    t.string "registration_url"
    t.string "registration_url_gi"
    t.string "registration_url_nogi"
    t.datetime "results_fetch_planned_at"
    t.datetime "results_imported_at"
    t.datetime "results_last_checked_at"
    t.bigint "results_sync_run_id"
    t.string "results_sync_status"
    t.text "schedule_note"
    t.integer "season_year"
    t.string "slug"
    t.bigint "source_event_id"
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
    t.index ["asjjf_calendar_snapshot_id"], name: "index_events_on_asjjf_calendar_snapshot_id"
    t.index ["organization_id"], name: "index_events_on_organization_id"
    t.index ["results_sync_run_id"], name: "index_events_on_results_sync_run_id"
    t.index ["season_year"], name: "index_events_on_season_year"
    t.index ["slug"], name: "index_events_on_slug", unique: true, where: "((slug IS NOT NULL) AND ((slug)::text <> ''::text))"
    t.index ["source_event_id"], name: "index_events_on_source_event_id"
    t.index ["translation_status"], name: "index_events_on_translation_status"
    t.check_constraint "ticket_sales_status::text = ANY (ARRAY['unavailable'::character varying::text, 'on_sale'::character varying::text, 'sold_out'::character varying::text, 'closed'::character varying::text])", name: "events_ticket_sales_status_check"
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

  create_table "identity_reviews", force: :cascade do |t|
    t.bigint "candidate_academy_id"
    t.datetime "created_at", null: false
    t.string "normalized_name", null: false
    t.string "raw_name", null: false
    t.bigint "resolved_academy_id"
    t.string "status", default: "pending", null: false
    t.datetime "updated_at", null: false
    t.index ["candidate_academy_id"], name: "index_identity_reviews_on_candidate_academy_id"
    t.index ["normalized_name"], name: "index_identity_reviews_on_normalized_name", unique: true
    t.index ["resolved_academy_id"], name: "index_identity_reviews_on_resolved_academy_id"
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
    t.boolean "confirmed", default: true, null: false
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

  create_table "results_sync_runs", force: :cascade do |t|
    t.datetime "applied_at"
    t.bigint "approved_by_id"
    t.datetime "created_at", null: false
    t.jsonb "diff_summary", default: {}, null: false
    t.datetime "discarded_at"
    t.text "error"
    t.bigint "event_id", null: false
    t.jsonb "guard_failures", default: [], null: false
    t.string "status", null: false
    t.string "trigger", null: false
    t.datetime "updated_at", null: false
    t.index ["approved_by_id"], name: "index_results_sync_runs_on_approved_by_id"
    t.index ["event_id", "created_at"], name: "index_results_sync_runs_on_event_id_and_created_at"
    t.index ["event_id"], name: "index_results_sync_runs_on_event_id"
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

  create_table "sponsor_audit_logs", force: :cascade do |t|
    t.string "action", null: false
    t.bigint "actor_id"
    t.string "actor_name", null: false
    t.jsonb "change_set", default: {}, null: false
    t.datetime "created_at", null: false
    t.bigint "sponsor_id"
    t.string "sponsor_name", null: false
    t.datetime "updated_at", null: false
    t.index ["actor_id"], name: "index_sponsor_audit_logs_on_actor_id"
    t.index ["sponsor_id"], name: "index_sponsor_audit_logs_on_sponsor_id"
  end

  create_table "sponsor_placements", force: :cascade do |t|
    t.text "blurb"
    t.datetime "created_at", null: false
    t.string "cta_url"
    t.string "display_tier", default: "official", null: false
    t.date "ends_on"
    t.bigint "event_id"
    t.string "headline"
    t.string "placement_type", null: false
    t.integer "sort_order", default: 0, null: false
    t.bigint "sponsor_id", null: false
    t.date "starts_on"
    t.string "translation_status", default: "pending"
    t.jsonb "translations", default: {}, null: false
    t.datetime "updated_at", null: false
    t.string "video_url"
    t.index ["event_id"], name: "index_sponsor_placements_on_event_id"
    t.index ["sponsor_id"], name: "index_sponsor_placements_on_sponsor_id"
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
    t.datetime "availability_checked_at"
    t.boolean "availability_hidden", default: false, null: false
    t.string "availability_status", default: "unknown", null: false
    t.string "belt_rank"
    t.string "category"
    t.string "competitor_1_name"
    t.string "competitor_2_name"
    t.integer "consecutive_failures", default: 0, null: false
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

  add_foreign_key "academies", "academies", column: "parent_id"
  add_foreign_key "active_storage_attachments", "active_storage_blobs", column: "blob_id"
  add_foreign_key "active_storage_variant_records", "active_storage_blobs", column: "blob_id"
  add_foreign_key "asjjf_calendar_reviews", "asjjf_snapshots", column: "snapshot_id"
  add_foreign_key "asjjf_calendar_reviews", "events"
  add_foreign_key "asjjf_calendar_runs", "asjjf_snapshots", column: "snapshot_id"
  add_foreign_key "asjjf_fetch_requests", "asjjf_snapshots", column: "snapshot_id"
  add_foreign_key "asjjf_ranking_divisions", "asjjf_ranking_lists"
  add_foreign_key "asjjf_ranking_divisions", "asjjf_snapshots", column: "source_snapshot_id", on_delete: :nullify
  add_foreign_key "asjjf_ranking_entries", "academies", on_delete: :nullify
  add_foreign_key "asjjf_ranking_entries", "asjjf_ranking_divisions"
  add_foreign_key "asjjf_ranking_entries", "asjjf_ranking_lists"
  add_foreign_key "asjjf_ranking_entries", "asjjf_snapshots", column: "source_snapshot_id", on_delete: :nullify
  add_foreign_key "asjjf_ranking_entries", "competitors", on_delete: :nullify
  add_foreign_key "asjjf_ranking_lists", "asjjf_ranking_seasons"
  add_foreign_key "asjjf_ranking_lists", "asjjf_snapshots", column: "source_snapshot_id", on_delete: :nullify
  add_foreign_key "asjjf_ranking_suggestions", "asjjf_snapshots", column: "source_snapshot_id", on_delete: :nullify
  add_foreign_key "asjjf_snapshots", "users", column: "uploaded_by_user_id", on_delete: :nullify
  add_foreign_key "competitor_aliases", "competitors"
  add_foreign_key "competitor_aliases", "users", column: "created_by_id"
  add_foreign_key "competitors", "academies"
  add_foreign_key "event_accommodations", "events"
  add_foreign_key "event_asjjf_sources", "events"
  add_foreign_key "event_audit_entries", "events"
  add_foreign_key "event_audit_entries", "users", column: "actor_id", on_delete: :nullify
  add_foreign_key "event_gallery_albums", "events"
  add_foreign_key "event_gallery_images", "event_gallery_imports"
  add_foreign_key "event_gallery_images", "event_gallery_upload_batches"
  add_foreign_key "event_gallery_images", "events"
  add_foreign_key "event_gallery_import_entries", "event_gallery_images", on_delete: :nullify
  add_foreign_key "event_gallery_import_entries", "event_gallery_imports"
  add_foreign_key "event_gallery_imports", "events"
  add_foreign_key "event_gallery_upload_batches", "events"
  add_foreign_key "event_results", "academies"
  add_foreign_key "event_results", "competitors"
  add_foreign_key "event_results", "events"
  add_foreign_key "event_schedule_items", "events"
  add_foreign_key "events", "asjjf_snapshots", column: "asjjf_calendar_snapshot_id"
  add_foreign_key "events", "events", column: "source_event_id", on_delete: :nullify
  add_foreign_key "events", "organizations"
  add_foreign_key "events", "results_sync_runs", on_delete: :nullify
  add_foreign_key "identity_reviews", "academies", column: "candidate_academy_id"
  add_foreign_key "identity_reviews", "academies", column: "resolved_academy_id"
  add_foreign_key "prize_categories", "events"
  add_foreign_key "results_sync_runs", "events"
  add_foreign_key "results_sync_runs", "users", column: "approved_by_id", on_delete: :nullify
  add_foreign_key "solid_queue_blocked_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "solid_queue_claimed_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "solid_queue_failed_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "solid_queue_ready_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "solid_queue_recurring_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "solid_queue_scheduled_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "sponsor_audit_logs", "sponsors", on_delete: :nullify
  add_foreign_key "sponsor_audit_logs", "users", column: "actor_id", on_delete: :nullify
  add_foreign_key "sponsor_placements", "events", on_delete: :cascade
  add_foreign_key "sponsor_placements", "sponsors"
  add_foreign_key "sponsors", "organizations"
  add_foreign_key "users", "users", column: "invited_by_id", on_delete: :nullify
  add_foreign_key "videos", "events"
end
