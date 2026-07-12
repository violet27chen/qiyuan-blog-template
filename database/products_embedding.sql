-- ============================================================
-- Supabase 资源站 RAG 向量支持迁移
-- 给资源站 products 表加 embedding 列 + 余弦索引 + 语义检索 RPC
-- 在 Supabase SQL 编辑器（或 supabase db 执行）运行一次即可，幂等。
--
-- 检索源与博客 rag_posts（Neon）独立：
--   博客文章 → Neon rag_posts（pgvector，由博客构建时索引）
--   资源站资源 → Supabase products（pgvector，本文件 + 发布/更新时自动嵌入 + 回填脚本）
-- 两者在边缘函数 handleChatRag 内分别检索、各自重排后合并上下文送生成。
-- ============================================================

-- 1) 启用 pgvector 扩展（已启用会跳过）
CREATE EXTENSION IF NOT EXISTS vector;

-- 2) products 表加 1024 维向量列（bge-m3 固定 1024 维）
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS embedding vector(1024);

-- 3) HNSW 余弦索引（加速最近邻检索）
CREATE INDEX IF NOT EXISTS products_embedding_idx
  ON products
  USING hnsw (embedding vector_cosine_ops);

-- 4) 语义检索 RPC：仅返回上架(is_active)且有向量的商品
--    query_embedding 以文本形式的向量字面量传入（如 "[0.1,0.2,...]"），
--    在 SQL 内 cast 为 vector(1024)，避免 PostgREST 对 JSON 数组到 vector 的类型歧义。
--    返回 link = quark_link（资源站网盘分享链接列名即 quark_link，表中无 link/drive_link 列）。
CREATE OR REPLACE FUNCTION match_products(
  query_embedding text,
  match_threshold float DEFAULT 0.0,
  match_count int DEFAULT 15
)
RETURNS TABLE (
  id int,
  name text,
  description text,
  category text,
  link text,
  cloud_type text,
  image_url text,
  similarity float
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.name,
    p.description,
    p.category,
    p.quark_link AS link,
    p.cloud_type,
    p.image_url,
    1 - (p.embedding <=> (query_embedding::vector(1024))) AS similarity
  FROM products p
  WHERE p.is_active = TRUE
    AND p.embedding IS NOT NULL
    AND 1 - (p.embedding <=> (query_embedding::vector(1024))) > match_threshold
  ORDER BY p.embedding <=> (query_embedding::vector(1024))
  LIMIT match_count
$$;

-- 5) 自动维护 updated_at（可选，便于排查最近嵌入时间）
--    仅当列不存在时添加；触发器仅在不存在时创建。
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE products ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_products_updated_at ON products;
CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
