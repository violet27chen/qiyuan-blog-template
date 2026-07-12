-- Resource category i18n labels (blog / qiyuan resources page)
-- products.category stores the Chinese key; this table stores display labels per locale.
-- Update via Supabase dashboard, MCP upsert_category_labels, or publish with category_label_* fields.

CREATE TABLE IF NOT EXISTS resource_category_i18n (
  key VARCHAR(50) PRIMARY KEY,
  label_zh VARCHAR(100) NOT NULL,
  label_en VARCHAR(100) NOT NULL,
  label_ja VARCHAR(100) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed existing categories (safe to re-run: ON CONFLICT DO UPDATE)
INSERT INTO resource_category_i18n (key, label_zh, label_en, label_ja) VALUES
  ('AI工具', 'AI工具', 'AI Tools', 'AIツール'),
  ('其他', '其他', 'Other', 'その他'),
  ('变声工具', '变声工具', 'Voice Changers', 'ボイスチェンジャー'),
  ('多媒体', '多媒体', 'Multimedia', 'マルチメディア'),
  ('学习资料', '学习资料', 'Learning', '学習資料'),
  ('影视资源', '影视资源', 'Movies & TV', '映像リソース'),
  ('效率工具', '效率工具', 'Productivity', '効率化ツール'),
  ('游戏资源', '游戏资源', 'Games', 'ゲーム'),
  ('软件工具', '软件工具', 'Software', 'ソフトウェア')
ON CONFLICT (key) DO UPDATE SET
  label_zh = EXCLUDED.label_zh,
  label_en = EXCLUDED.label_en,
  label_ja = EXCLUDED.label_ja,
  updated_at = NOW();
