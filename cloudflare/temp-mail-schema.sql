-- 临时邮箱 D1 数据库 schema
-- 建库： wrangler d1 create temp_mail
-- 建表： wrangler d1 execute temp_mail --file=cloudflare/temp-mail-schema.sql
-- 生成地址与邮件均按 24h 保留（由收信 Worker 与边缘函数定期清理过期记录）

CREATE TABLE IF NOT EXISTS temp_addresses (
  addr       TEXT PRIMARY KEY,       -- 生成的临时地址，如 a8f3k2@白嫖域名
  created_at INTEGER NOT NULL        -- 创建时间戳(ms)
);

CREATE TABLE IF NOT EXISTS temp_messages (
  id         TEXT PRIMARY KEY,       -- 邮件唯一 id (UUID)
  addr       TEXT NOT NULL,          -- 收件地址（对应 temp_addresses.addr）
  from_addr  TEXT,                   -- 发件人
  subject    TEXT,                   -- 主题
  body_text  TEXT,                   -- 纯文本正文
  body_html  TEXT,                   -- HTML 正文（可能为 null）
  received_at INTEGER NOT NULL,      -- 接收时间戳(ms)
  raw_size   INTEGER                 -- 原始邮件字节数
);

CREATE INDEX IF NOT EXISTS idx_temp_messages_addr ON temp_messages(addr);
CREATE INDEX IF NOT EXISTS idx_temp_messages_received ON temp_messages(received_at);
