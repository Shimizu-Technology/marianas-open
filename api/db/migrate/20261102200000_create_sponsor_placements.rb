class CreateSponsorPlacements < ActiveRecord::Migration[8.1]
  def up
    create_table :sponsor_placements do |t|
      t.references :sponsor, null: false, foreign_key: true
      t.references :event, foreign_key: { on_delete: :cascade }
      t.string :placement_type, null: false
      t.string :display_tier, null: false, default: "official"
      t.integer :sort_order, null: false, default: 0
      t.date :starts_on
      t.date :ends_on
      t.string :headline
      t.text :blurb
      t.string :video_url
      t.string :cta_url
      t.jsonb :translations, default: {}, null: false
      t.string :translation_status, default: "pending"
      t.timestamps
    end
    create_table :sponsor_audit_logs do |t|
      t.references :sponsor, foreign_key: { on_delete: :nullify }
      t.references :actor, foreign_key: { to_table: :users, on_delete: :nullify }
      t.string :sponsor_name, null: false
      t.string :actor_name, null: false
      t.string :action, null: false
      t.jsonb :change_set, default: {}, null: false
      t.timestamps
    end
    backfill_placements
  end

  # Use migration-local records: never run today's callbacks against historical data.
  def backfill_placements
    sponsor_class = Class.new(ActiveRecord::Base) { self.table_name = "sponsors" }
    placement_class = Class.new(ActiveRecord::Base) { self.table_name = "sponsor_placements" }
    event_class = Class.new(ActiveRecord::Base) { self.table_name = "events" }
    sponsor_class.find_each do |sponsor|
      key = sponsor.name.downcase.gsub(/[^a-z0-9]/, "")
      gvb = key.include?("gvb") || key.include?("guamvisitorsbureau")
      type = gvb ? "presenting" : (sponsor.tier == "presenting" ? "secondary" : "official")
      if gvb || sponsor.tier.in?(%w[presenting official])
        placement_class.find_or_create_by!(sponsor_id: sponsor.id, placement_type: type, event_id: nil) do |p|
          p.sort_order = sponsor.sort_order || 0
          p.display_tier = type
          # The old home page supplied these destinations when no website was stored.
          p.cta_url = "https://www.hoteltano.com" if [ "hoteltano", "hoteltanoguam" ].include?(key)
          p.cta_url = "https://www.visitguam.com" if gvb && sponsor.website_url.blank?
          if gvb
            p.blurb = "As our Presenting Partner, the Guam Visitors Bureau champions the growth of sports tourism while showcasing Guam's unique culture and hospitality to the world."
            p.translations = { "blurb" => { "ja" => "プレゼンティングパートナーとして、Guam Visitors Bureau はスポーツツーリズムの発展を力強く後押しし、Guamならではの文化とおもてなしを世界に発信しています。", "ko" => "프리젠팅 파트너인 Guam Visitors Bureau는 괌의 고유한 문화와 환대를 세계에 알리는 동시에 스포츠 관광의 성장을 선도하고 있습니다.", "pt" => "Como nosso Parceiro Apresentador, o Guam Visitors Bureau impulsiona o crescimento do turismo esportivo enquanto apresenta ao mundo a cultura única e a hospitalidade de Guam.", "tl" => "Bilang aming Pangunahing Kasosyo, itinataguyod ng Guam Visitors Bureau ang paglago ng sports tourism habang ipinapakita sa mundo ang natatanging kultura at mabuting pagtanggap ng Guam.", "zh" => "作为我们的冠名合作伙伴，Guam Visitors Bureau 持续推动体育旅游发展，同时向世界展示 Guam 独特的文化魅力与热情好客。", "zh-Hant" => "作為我們的冠名合作夥伴，Guam Visitors Bureau 致力推動運動觀光發展，同時向世界展現 Guam 獨特的文化與好客精神。" } }
            p.translation_status = "translated"
          end
        end
      end
      # Previously every sponsor appeared on every event. Preserve that lineup,
      # with the requested Hotel Tano scope represented explicitly.
      hotel = [ "hoteltano", "hoteltanoguam" ].include?(key)
      event_id = hotel ? event_class.find_by(slug: "marianas-open-2026", organization_id: sponsor.organization_id)&.id : nil
      placement_class.find_or_create_by!(sponsor_id: sponsor.id, placement_type: "event", event_id: event_id) do |p|
        p.sort_order = sponsor.sort_order || 0
        p.display_tier = type
      end
    end
  end

  def down
    raise ActiveRecord::IrreversibleMigration, "Sponsor placements and their audit history must be preserved"
  end
end
