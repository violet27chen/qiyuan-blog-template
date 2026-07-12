/**
 * scripts/lib/rag-index.mjs
 * 共享的「文章 → 向量 → Neon」索引逻辑，被两处复用：
 *   - scripts/index-posts-neon.mjs         （手动：npm run index:neon）
 *   - integrations/index-rag-neon.mjs      （构建时自动：astro build 的 astro:build:done）
 *
 * 流程：复用 scripts/lib/corpus.mjs 的 buildDocuments() 读取并清洗全部文章（跳过 draft/加密）
 *       → 批量调 SiliconFlow BAAI/bge-m3 生成 1024 维向量 → upsert 进 Neon rag_posts 表。
 *
 * 注：资源站资源(products)的向量不在本文件处理——它在 Supabase，
 *     由边缘函数的 publish/update 自动嵌入，历史数据用 scripts/backfill-resources-embeddings.mjs 回填。
 */

import { buildDocuments } from './corpus.mjs';
import { neon } from '@neondatabase/serverless';

const EMBED_MODEL = 'BAAI/bge-m3';
const SILICONFLOW_EMBED_URL = 'https://api.siliconflow.cn/v1/embeddings';
const MAX_INPUT_CHARS = 8000; // 单篇嵌入文本上限，避免超 token

/**
 * 批量生成嵌入向量。
 * @param {string[]} texts
 * @param {string} apiKey SiliconFlow API Key
 * @returns {Promise<number[][]>}
 */
export async function embedBatch(texts, apiKey) {
  const resp = await fetch(SILICONFLOW_EMBED_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: EMBED_MODEL, input: texts, encoding_format: 'float' }),
  });
  if (!resp.ok) {
    const detail = await resp.text().catch(() => '');
    throw new Error(`SiliconFlow 嵌入失败 ${resp.status}: ${detail}`);
  }
  const json = await resp.json();
  const data = Array.isArray(json?.data) ? json.data : [];
  return data
    .slice()
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .map((d) => d.embedding);
}

/**
 * 读取全站文章并写入 Neon 向量库（upsert，按 id 冲突则更新）。
 * @param {{ apiKey: string, neonUrl: string, onLog?: (msg: string) => void }} opts
 * @returns {Promise<number>} 成功索引的篇数
 */
export async function indexPostsToNeon({ apiKey, neonUrl, onLog } = {}) {
  const log = onLog || (() => {});
  if (!apiKey || !neonUrl) {
    throw new Error('缺少 SILICONFLOW_API_KEY 或 NEON_SERVERLESS_URL');
  }

  const docs = buildDocuments();
  if (!docs.length) {
    throw new Error('没有读取到任何文章');
  }
  log(`读取 ${docs.length} 篇文章，开始生成向量...`);

  const inputs = docs.map((d) =>
    `${d.title}\n${d.description || ''}\n${d.body}`.slice(0, MAX_INPUT_CHARS)
  );
  const vectors = await embedBatch(inputs, apiKey);
  if (vectors.length !== docs.length) {
    throw new Error(`向量数量(${vectors.length})与文章数(${docs.length})不一致`);
  }

  const sql = neon(neonUrl);
  let ok = 0;
  for (let i = 0; i < docs.length; i++) {
    const d = docs[i];
    const vec = '[' + vectors[i].join(',') + ']';
    await sql(
      `INSERT INTO rag_posts (id, slug, title, url, lang, alternates, body, embedding)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::vector)
       ON CONFLICT (id) DO UPDATE SET
         title = $3, url = $4, lang = $5, alternates = $6,
         body = $7, embedding = $8::vector, updated_at = now()`,
      [
        d.id,
        d.id,
        d.title,
        d.url,
        d.lang || 'zh',
        JSON.stringify(d.alternates || {}),
        d.body,
        vec,
      ]
    );
    ok++;
    if ((i + 1) % 5 === 0 || i + 1 === docs.length) {
      log(`已索引 ${i + 1}/${docs.length}`);
    }
  }
  return ok;
}
