-- ============================================================================
-- 祈愿博客 · AI 站内助手 RAG 向量库（Neon + pgvector）
-- 技术栈：硅基流动 BAAI/bge-m3（1024 维）嵌入 + Neon(pgvector) 存储
-- 生成模型：Moonshot moonshot-v1-128k（边缘函数内调用，不在此 SQL 内）
-- 用途：scripts/index-posts-neon.mjs / integrations/index-rag-neon.mjs 把每篇博客文章
--       嵌入后写入 rag_posts 表；边缘函数 edge-functions/api/[[default]].js 查询时做余弦检索。
-- 执行方式：在 Neon 控制台的 SQL 编辑器里直接运行本文件即可（可重复运行，幂等）。
--
-- 表名用 rag_posts（而非 posts）以避开你 Neon 实例里可能已存在的同名表，
-- 避免「column embedding does not exist」冲突。
-- ============================================================================

-- 启用向量扩展（Neon 实例只需一次）
CREATE EXTENSION IF NOT EXISTS vector;

-- 文章向量表（id 即主键；若表已存在则跳过整段建表）
CREATE TABLE IF NOT EXISTS rag_posts (
  id         TEXT PRIMARY KEY,                         -- 文章 slug
  slug       TEXT NOT NULL,                            -- 同 id（便于阅读）
  title      TEXT NOT NULL,                            -- 文章标题
  url        TEXT NOT NULL,                            -- 默认语言(zh)规范链接，100% 真实
  lang       TEXT DEFAULT 'zh',                        -- 默认语言
  alternates TEXT DEFAULT '{}',                        -- 多语言链接 JSON: {"zh":..,"en":..,"ja":..}
  body       TEXT,                                     -- 正文纯文本（已清洗）
  embedding  vector(1024),                             -- BAAI/bge-m3 输出 1024 维
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 幂等兜底：若表已存在但缺某些列（例如从旧 posts 表改名而来），补齐之。
-- 注意：CREATE TABLE 已声明 id 为主键，这里绝不能再 ADD PRIMARY KEY，否则报
-- 「multiple primary keys」(42P16)。主键仅在确实缺失时才补（见下方 DO 块）。
ALTER TABLE rag_posts ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE rag_posts ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE rag_posts ADD COLUMN IF NOT EXISTS url TEXT;
ALTER TABLE rag_posts ADD COLUMN IF NOT EXISTS lang TEXT DEFAULT 'zh';
ALTER TABLE rag_posts ADD COLUMN IF NOT EXISTS alternates TEXT DEFAULT '{}';
ALTER TABLE rag_posts ADD COLUMN IF NOT EXISTS body TEXT;
ALTER TABLE rag_posts ADD COLUMN IF NOT EXISTS embedding vector(1024);
ALTER TABLE rag_posts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 仅在确实没有主键时补（避免 42P16）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'rag_posts'::regclass AND contype = 'p'
  ) THEN
    ALTER TABLE rag_posts ADD PRIMARY KEY (id);
  END IF;
END $$;

-- 余弦距离索引（HNSW）。<= 表示「越小越相似」。可重复运行。
CREATE INDEX IF NOT EXISTS rag_posts_embedding_idx
  ON rag_posts USING hnsw (embedding vector_cosine_ops);

-- 常用查询示例（边缘函数实际执行的是参数化版）：
--   SELECT id, slug, title, url, lang, alternates, body
--   FROM rag_posts
--   ORDER BY embedding <=> $1::vector
--   LIMIT 5;
