class UpdateInternationalReachMagazineCount < ActiveRecord::Migration[8.1]
  def up
    content = SiteContent.find_by(key: "international_reach_desc")
    return unless content

    content.update!(
      value_en: "Partners in Korea, Japan, Taiwan, Philippines, and Hong Kong. Featured in 40,000 printed magazines across Asia.",
      value_ja: "韓国、日本、台湾、フィリピン、香港にパートナー。アジア全域で40,000部の印刷雑誌に掲載。",
      value_ko: "한국, 일본, 대만, 필리핀, 홍콩에 파트너. 아시아 전역 40,000부의 인쇄 잡지에 게재.",
      value_tl: "Mga partner sa Korea, Japan, Taiwan, Pilipinas, at Hong Kong. Nai-feature sa 40,000 naka-print na magazine sa buong Asia.",
      value_zh: "在韩国、日本、台湾、菲律宾和香港拥有合作伙伴。在亚洲各地40,000份印刷杂志上刊登。"
    )
  end

  def down
    content = SiteContent.find_by(key: "international_reach_desc")
    return unless content

    content.update!(
      value_en: "Partners in Korea, Japan, Taiwan, Philippines, and Hong Kong. Featured in 30,000+ printed magazines across Asia.",
      value_ja: "韓国、日本、台湾、フィリピン、香港にパートナー。アジア全域で30,000部以上の雑誌に掲載。",
      value_ko: "한국, 일본, 대만, 필리핀, 홍콩에 파트너. 아시아 전역 30,000부 이상의 잡지에 게재.",
      value_tl: "Mga partner sa Korea, Japan, Taiwan, Pilipinas, at Hong Kong. Nai-feature sa 30,000+ naka-print na magazine sa buong Asia.",
      value_zh: "在韩国、日本、台湾、菲律宾和香港拥有合作伙伴。在亚洲各地30,000多份印刷杂志上刊登。"
    )
  end
end
