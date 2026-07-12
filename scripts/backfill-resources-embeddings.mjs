/**
 * scripts/backfill-resources-embeddings.mjs
 * 给资源站 Supabase products 表的历史商品回填 RAG 向量（embedding vector(1024)）。
 *
 * 背景：
 *   - 资源向量的「自动嵌入」只在边缘函数 publish_product / update_product 时触发；
 *   - 历史已上架的商品没有向量，站内助手与 MCP search_products 都搜不到它们；
 *   - 本脚本一次性把缺向量的商品补齐，使资源站也能被语义检索。
 *
 * 前置：
 *   - 先在 Supabase 跑 database/products_embedding.sql（加 embedding 列 + match_products RPC）。
 *   - 注入以下环境变量（不要写进仓库）：
 *       SUPABASE_URL          如 https://xxxx.supabase.co
 *       SUPABASE_SERVICE_KEY  service_role key（有写权限）
 *       SILICONFLOW_API_KEY   硅基流动 key（bge-m3 嵌入）
 *
 * 用法：
 *   node scripts/backfill-resources-embeddings.mjs
 *   REEMBED=1 node scripts/backfill-resources-embeddings.mjs     # 忽略是否已有向量，全量重嵌
 *   DRY=1    node scripts/backfill-resources-embeddings.mjs       # 只打印待处理数量，不写回
 *
 * 注意：脚本用全局 fetch（Node >= 18），无需额外依赖。
 */

const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/$/, '');
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SF_KEY = process.env.SILICONFLOW_API_KEY;
const REEMBED = process.env.REEMBED === '1';
const DRY = process.env.DRY === '1';

const EMBED_MODEL = 'BAAI/bge-m3';
const SILICONFLOW_EMBED_URL = 'https://api.siliconflow.cn/v1/embeddings';
const BATCH = 20;          // 每批嵌入的商品数（控制在硅基流动限流内）
const PAGE = 1000;         // 每次从 Supabase 拉取的商品数

function fail(msg) {
  console.error(`[backfill] 错误: ${msg}`);
  process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_KEY) fail('缺少 SUPABASE_URL / SUPABASE_SERVICE_KEY');
if (!SF_KEY) fail('缺少 SILICONFLOW_API_KEY');

async function sbSelect(params) {
  const url = `${SUPABASE_URL}/rest/v1/products?${params}`;
  const resp = await fetch(url, {
    headers: { 'apikey': SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    throw new Error(`Supabase 读取失败 ${resp.status}: ${txt}`);
  }
  return resp.json();
}

async function sbPatch(id, embedding) {
  const url = `${SUPABASE_URL}/rest/v1/products?id=eq.${encodeURIComponent(id)}`;
  const resp = await fetch(url, {
    method: 'PATCH',
    headers: { 'apikey': SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ embedding: '[' + embedding.join(',') + ']' }),
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    throw new Error(`Supabase 写回失败 ${resp.status}: ${txt}`);
  }
}

async function embedBatch(texts) {
  const resp = await fetch(SILICONFLOW_EMBED_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SF_KEY}` },
    body: JSON.stringify({ model: EMBED_MODEL, input: texts, encoding_format: 'float' }),
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    throw new Error(`硅基流动嵌入失败 ${resp.status}: ${txt}`);
  }
  const json = await resp.json();
  const data = Array.isArray(json?.data) ? json.data : [];
  return data
    .slice()
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .map((d) => d.embedding);
}

async function main() {
  // 1) 拉取待处理商品：默认只取缺向量(is_active)的；REEMBED 时取全部上架商品
  const filter = REEMBED
    ? 'is_active=eq.true&select=id,name,description'
    : 'is_active=eq.true&embedding=is.null&select=id,name,description';

  let all = [];
  let offset = 0;
  while (true) {
    const page = await sbSelect(`${filter}&limit=${PAGE}&offset=${offset}`);
    if (!Array.isArray(page) || page.length === 0) break;
    all = all.concat(page);
    if (page.length < PAGE) break;
    offset += PAGE;
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`[backfill] 待处理商品数: ${all.length}${REEMBED ? '（全量，含已有向量）' : '（仅缺向量）'}`);
  if (all.length === 0) {
    console.log('[backfill] 没有需要补充向量的商品，结束。');
    return;
  }
  if (DRY) {
    console.log('[backfill] DRY 模式，不写回。示例前 5 条:', all.slice(0, 5).map((p) => `#${p.id} ${p.name}`));
    return;
  }

  // 2) 分批嵌入并写回
  let done = 0;
  let skipped = 0;
  for (let i = 0; i < all.length; i += BATCH) {
    const chunk = all.slice(i, i + BATCH);
    const texts = chunk.map((p) => `${p.name || ''}\n${p.description || ''}`.slice(0, 8000));
    let vectors;
    try {
      vectors = await embedBatch(texts);
    } catch (e) {
      console.error(`[backfill] 第 ${i / BATCH + 1} 批嵌入失败，跳过该批: ${e?.message || e}`);
      skipped += chunk.length;
      await new Promise((r) => setTimeout(r, 1000)); // 限流后稍等
      continue;
    }
    for (let j = 0; j < chunk.length; j++) {
      const p = chunk[j];
      const vec = vectors[j];
      if (!Array.isArray(vec)) { skipped++; continue; }
      try {
        await sbPatch(p.id, vec);
        done++;
      } catch (e) {
        console.error(`[backfill] #${p.id} 写回失败: ${e?.message || e}`);
        skipped++;
      }
    }
    console.log(`[backfill] 进度 ${Math.min(i + BATCH, all.length)}/${all.length}（已写回 ${done}，失败 ${skipped}）`);
    await new Promise((r) => setTimeout(r, 300)); // 轻量限速，避免硅基流动 429
  }

  console.log(`[backfill] 完成：成功 ${done} 条，失败/跳过 ${skipped} 条。`);
}

main().catch((e) => fail(e?.message || String(e)));
