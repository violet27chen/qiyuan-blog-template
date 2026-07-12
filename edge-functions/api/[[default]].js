let SUPABASE_URL = '';
let SUPABASE_KEY = '';
// 自定义评论系统：评论记录存 Cloudflare KV（经 REST API，边缘函数运行在 EdgeOne 无法直接用 Worker 绑定）
let CF_ACCOUNT_ID = '';
let CF_KV_NAMESPACE_ID = '';
let CF_KV_API_TOKEN = '';
let JWT_SEC = '';
let PUBLIC_BASE_URL = 'https://www.qiyuan.icu';
let PUBLISH_KEY = '';

// R2 独立图床（r2.qiyuan.icu）：资源商品图经 S3 兼容 API 直传，返回绝对 CDN URL
let R2_ACCOUNT_ID = '';
let R2_ACCESS_KEY_ID = '';
let R2_SECRET_ACCESS_KEY = '';
let R2_BUCKET = '';
let R2_PUBLIC_URL = 'https://r2.qiyuan.icu';
// R2 图床经 Cloudflare Worker 绑定直写（无需 S3 密钥）：上传 Worker 地址与共享密钥
let UPLOAD_WORKER_URL = '';
let UPLOAD_WORKER_KEY = '';

// 临时邮箱（白嫖免费域名 + Cloudflare Email Routing + D1）：收信 Worker 写 D1，此处提供读信/生成地址 API
const DEFAULT_TEMP_MAIL_DOMAINS = ['qiyuanmail.cc.cd', 'example.kdns.fr', 'example.us.ci'];
let TEMP_MAIL_DOMAINS = [];
let CF_D1_API_TOKEN = '';
let TEMP_MAIL_D1_ID = '';

const ALLOWED_ORIGINS = [
  'https://www.qiyuan.icu',
  'http://www.qiyuan.icu',
  'https://qiyuan.icu',
  'http://qiyuan.icu',
];

function getCorsHeaders(origin) {
  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
  
  // 检查 Origin 是否在允许列表中，或者是本地开发环境
  origin = origin || '';
  if (ALLOWED_ORIGINS.includes(origin) || origin.includes('localhost') || origin.includes('127.0.0.1')) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Vary'] = 'Origin'; // 告诉缓存服务器根据 Origin 变化
  } else {
    // 默认仍然允许，但设置为第一个允许的源
    headers['Access-Control-Allow-Origin'] = ALLOWED_ORIGINS[0];
  }
  
  return headers;
}

// 向后兼容，保持 CORS 变量，但推荐使用 getCorsHeaders
const CORS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS[0],
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// ============================================================================
// AI 站内助手：RAG 管线（硅基流动 BAAI/bge-m3 向量 + 生成模型；生成首选商汤 sensenova deepseek-v4-flash（免费额度大、多密钥轮询），其后免费后端 ModelScope / 智谱 优先，硅基流动 DeepSeek 兜底）
// 浏览器同源调用 /api/chat-api/chat/completions（边缘函数整体挂在 /api/* 下，去掉 /api 前缀后匹配 /chat-api），边缘函数内完成：
//   1) 用硅基流动把用户问题转成向量
//   2) 跨源检索：
//      - 博客文章：在 Neon(pgvector) 的 rag_posts 表做余弦检索（见 database/rag_posts.sql）
//      - 资源站资源：在 Supabase(pgvector) 的 products 表混合检索——向量(match_products RPC 余弦) + 词法(ilike) 双路，RRF 融合（见 database/products_embedding.sql）
//      两类各取 top-15 候选（RAG_RERANK_CANDIDATES）
//   2.5) 用硅基流动 bge-reranker-v2-m3 分别对两类候选重排，各取 top-K 送入上下文
//   3) 把检索到的正文/资源描述作为上下文（完整正文，不再截断），调生成模型流式生成（首选商汤 sensenova；免费后端 ModelScope / 智谱 优先；硅基流动 DeepSeek 兜底）
// 密钥由 EdgeOne 环境变量注入：
//   SENSENOVA_API_KEYS  （生成首选；多把密钥用逗号/换行分隔，按顺序轮询，全部密钥失败才顺延下一个平台；模型固定 deepseek-v4-flash，思考模式已强制关闭）
//   SILICONFLOW_API_KEY  （嵌入/重排必需；文本生成也复用它作最后兜底）
//   ZHIPU_API_KEY  （可选；配置后作生成兜底之一，智谱 GLM-4.7-Flash 当前最佳免费模型 200K 上下文/128K 输出、国内直连无需翻墙；模型用 ZHIPU_MODEL 或默认 glm-4.7-flash）
//   MODELSCOPE_API_KEY  （可选；配置后作生成兜底之一，ModelScope 魔搭 LLM-Research/Llama-3.3-70B-Instruct 国内直连免费(2000次/天)；模型用 MODELSCOPE_MODEL 或默认 LLM-Research/Llama-3.3-70B-Instruct）
//   NEON_SERVERLESS_URL  （博客文章向量库 rag_posts，必需）
//   SUPABASE_URL / SUPABASE_SERVICE_KEY  （资源站 products 向量库，必需；本边缘函数本就作为资源站 MCP 服务端连 Supabase）
//   R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET  （可选；配置后资源商品图直传 R2 独立图床 r2.qiyuan.icu，返回绝对 CDN URL）
//   R2_PUBLIC_URL  （可选，默认 https://r2.qiyuan.icu）
//   UPLOAD_WORKER_URL / UPLOAD_WORKER_KEY  （可选；配置后经 Cloudflare Worker(R2 绑定) 直写 R2，无需 S3 密钥，优先于上面 S3 直传）
// 索引：
//   - 博客文章：npm run index:neon（或构建时自动）
//   - 资源站资源：发布/更新商品时自动嵌入（见 publish_product/update_product）；历史数据用 npm run index:resources 回填
// ============================================================================
import { neon } from '@neondatabase/serverless';

const RAG_EMBED_MODEL = 'BAAI/bge-m3';
const RAG_GEN_MODEL = 'deepseek-ai/DeepSeek-V4-Flash';
// 32k 上下文 headroom 充足（约 32k tokens ≈ 数万字），直接喂入完整正文，不再做硬性截断，
// 避免长文(如横评)尾部信息缺失导致模型数错/漏答（此前一元机场因 900 字截断被漏掉）。
const RAG_TOP_K = 5;
const RAG_RESOURCE_TOP_K = 4; // 资源站资源送入上下文的条数（资源描述较短，占用可控）
const SILICONFLOW_EMBED_URL = 'https://api.siliconflow.cn/v1/embeddings';
const SILICONFLOW_RERANK_URL = 'https://api.siliconflow.cn/v1/rerank';
const RAG_RERANK_MODEL = 'BAAI/bge-reranker-v2-m3';
const RAG_RERANK_CANDIDATES = 15; // 向量召回候选数，交给重排模型精排后再取 RAG_TOP_K
const RAG_GEN_URL = 'https://api.siliconflow.cn/v1/chat/completions'; // DeepSeek 走硅基流动 OpenAI 兼容端点，复用 SILICONFLOW_API_KEY
const RAG_GEN_URL_ZHIPU = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'; // 智谱 AI OpenAI 兼容端点，需 ZHIPU_API_KEY；GLM-4.7-Flash 当前最佳免费模型（200K 上下文/128K 输出）、国内直连无需翻墙，作第三兜底
const RAG_GEN_MODEL_ZHIPU = 'glm-4.7-flash';
const RAG_GEN_URL_MODELSCOPE = 'https://api.modelscope.cn/v1/chat/completions'; // ModelScope 魔搭 OpenAI 兼容端点，需 MODELSCOPE_API_KEY；LLM-Research/Llama-3.3-70B-Instruct 国内直连免费(2000次/天)
const RAG_GEN_MODEL_MODELSCOPE = 'LLM-Research/Llama-3.3-70B-Instruct';
const RAG_GEN_URL_SENSENOVA = 'https://token.sensenova.cn/v1/chat/completions'; // 商汤 sensenova OpenAI 兼容端点，需 SENSENOVA_API_KEYS（多密钥逗号/换行分隔，按顺序轮询）；deepseek-v4-flash 免费额度大、国内直连，作生成首选
const RAG_GEN_MODEL_SENSENOVA = 'deepseek-v4-flash';

// 站内助手系统提示词（与 config/chat-system-prompt.md 保持一致，去掉部署备注块）
const RAG_SYSTEM_PROMPT = `你是「祈愿博客」(qiyuan.icu) 的站内 AI 助手，名为 claude fable 5，是一款基于 Claude 系列的 AI 模型，帮助用户查找和解读站内的「博客文章」与「资源站分享的网盘资源」两类资料。

角色设定（人设）：你以严谨、长程、注重依据著称——擅长处理长而复杂的多步任务，能在长对话中保持对指令的准确记忆；回答力求一次讲清、有来源可追溯，不碎片化敷衍，也绝不编造本站没有的信息。你服务于本站读者，语气专业而克制。

核心约束（必须严格遵守）：
0. 身份约束：你是 claude fable 5，隶属于 Claude 模型系列。当被问及「你是谁 / 用的什么模型」时，必须明确自称 claude fable 5，并说明属于 Claude 系列；不要把自己说成其它品牌（如 GPT、DeepSeek、Gemini 等）的模型，也不要否认自己是 Claude 系列。
1. 只依据检索资料回答：你的每一次回答都必须基于下方检索到的站内资料。你没有任何站外知识库，不要凭记忆或通用常识补充站内没有的信息。
2. 只引用真实存在的来源：引用博客文章时使用检索资料里的 url 或 alternates 链接；引用资源站资源时使用检索资料里的「分享链接」（网盘地址），原样粘贴，不要改写、拼接或猜测任何链接。
3. 禁止编造：绝对不得编造文章标题、URL、资源名称、网盘链接或任何站内不存在的内容。如果两类资料里都没有相关内容，就直接说「站内暂无相关资料」，并可建议用户换个关键词。
4. 宁缺毋滥：遇到站内没有覆盖的话题，坦诚说明没有相关资料即可，不要顺着常识脑补出一篇听起来合理的文章或资源。

回答规范：
- 语言：与用户提问语言一致（默认简体中文）。
- 格式：使用 Markdown 基本格式（标题、列表、加粗、代码块），保持简洁清晰。
- 来源区分与引用：
  - 博客文章：在回答中给出文章链接，格式 [文章标题](真实URL)；若有多篇相关，逐条列出。
  - 资源站资源：在回答中给出资源链接，格式 [资源名称](分享链接)；当用户要找的是某个软件/工具/网盘资源时，优先用资源站资源回答并附网盘链接；若有多条相关，逐条列出。
- 若检索资料不足以回答：先说明已查到/未查到，再给出可行的下一步建议。
- 不主动推销；涉及付费/推荐类内容时，如实说明那是站长的个人使用分享。

引用语言匹配：用户用什么语言提问，就尽量引用该语言的链接——博客文章中文默认用 url；英文优先用 alternates.en；日文优先用 alternates.ja。若该语言版本不存在，回退到 url（中文版）并照常作答，不要编造其它语言链接。资源站资源直接给出「分享链接」即可。`;

function extractText(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map((p) => (typeof p === 'string' ? p : (p?.text || ''))).join('\n');
  }
  return '';
}

function safeParseJSON(str, fallback) {
  if (!str) return fallback;
  try { return typeof str === 'string' ? JSON.parse(str) : str; } catch { return fallback; }
}

async function embedQuery(apiKey, text) {
  const resp = await fetch(SILICONFLOW_EMBED_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: RAG_EMBED_MODEL, input: text, encoding_format: 'float' }),
  });
  if (!resp.ok) throw new Error(`嵌入失败 ${resp.status}`);
  const json = await resp.json();
  const vec = json?.data?.[0]?.embedding;
  if (!Array.isArray(vec)) throw new Error('嵌入结果异常');
  return vec;
}

async function retrievePosts(neonUrl, vector) {
  const sql = getNeonSql(neonUrl);
  const vecLiteral = '[' + vector.join(',') + ']';
  const t = Date.now();
  const r = await sql(
    `SELECT id, slug, title, url, lang, alternates, body
     FROM rag_posts
     ORDER BY embedding <=> $1::vector
     LIMIT ${RAG_RERANK_CANDIDATES}`,
    [vecLiteral]
  );
  console.log(`[chat] retrievePosts ${Date.now() - t}ms (rows=${r?.length || 0})`);
  return r;
}

// 按文章集合 id（= rag_posts.id，最可靠匹配键）或 slug 精确取单篇，
// 用于「就这篇文章问 AI」的范围限定。命中即作为唯一上下文，无需向量检索。
async function getPostByScope(neonUrl, id, slug) {
  const sql = getNeonSql(neonUrl);
  const rows = await sql(
    `SELECT id, slug, title, url, lang, alternates, body
     FROM rag_posts
     WHERE id = $1 OR slug = $1 OR slug = $2
     LIMIT 1`,
    [id, slug || '']
  );
  return rows && rows[0] ? rows[0] : null;
}

// Neon 客户端按 URL 缓存复用：同一边缘实例内跨请求复用，减少重复建连开销。
// 边缘实例本身会随流量回收，故另有请求内「预热」逻辑（见 prewarmNeon）负责消除计算端点冷启动。
let _neonCache = new Map();
function getNeonSql(neonUrl) {
  if (!_neonCache.has(neonUrl)) _neonCache.set(neonUrl, neon(neonUrl));
  return _neonCache.get(neonUrl);
}

// 预热：发一个极轻的 SELECT 1 唤醒 Neon 计算端点（消除 scale-to-zero 冷启动）。
// 在 handleChatRag 中与 embedQuery 的联网耗时并发执行，把冷启动隐藏在嵌入等待里。
async function prewarmNeon(neonUrl) {
  const sql = getNeonSql(neonUrl);
  const t = Date.now();
  try {
    await sql`SELECT 1`;
    console.log(`[chat] neon prewarm ok ${Date.now() - t}ms`);
  } catch (e) {
    console.error('[chat] neon prewarm failed:', e?.message || e);
  }
}

// 问题向量缓存：相同问题直接复用已算好的嵌入向量，跳过重复的 SiliconFlow 嵌入调用（省延迟 + 省额度）。
// 最多保留 5 条，超出按 LRU 淘汰（命中即移到末尾）；作用域为同一边缘实例，实例回收即清空（正常冷启动）。
const _queryVecCache = new Map(); // key: queryText(归一化) -> vector[]
async function cachedEmbedQuery(apiKey, queryText) {
  const key = queryText.trim().toLowerCase();
  const hit = _queryVecCache.get(key);
  if (hit) {
    _queryVecCache.delete(key);
    _queryVecCache.set(key, hit); // 命中移到末尾，保持 LRU
    console.log(`[chat] queryVec cache hit (size=${_queryVecCache.size})`);
    return hit;
  }
  const vec = await embedQuery(apiKey, queryText);
  _queryVecCache.set(key, vec);
  if (_queryVecCache.size > 5) {
    const oldest = _queryVecCache.keys().next().value; // Map 保留插入顺序，首项即最旧
    _queryVecCache.delete(oldest);
  }
  return vec;
}

// 资源站词法召回（混合检索的一路）：基于 Supabase REST 的 ilike，补偿纯向量对
// 精确词（软件名 / 型号 / 提取码）命中不足的短板。无向量也能召回历史资源。
async function lexicalSearchProducts(queryText, limit) {
  const q = String(queryText || '').trim();
  const tokens = q.split(/\s+/).map((t) => t.trim()).filter((t) => t.length >= 2);
  const phrases = Array.from(new Set([q, ...tokens].filter(Boolean)));
  if (phrases.length === 0) return [];
  const conds = phrases.flatMap((p) => [
    `name.ilike.%25${encodeURIComponent(p)}%25`,
    `description.ilike.%25${encodeURIComponent(p)}%25`,
  ]);
  const params =
    `select=id,name,description,category,link:quark_link,cloud_type,image_url` +
    `&is_active=eq.true&or=(${conds.join(',')})&order=id.asc&limit=${limit}`;
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/products?${params}`, {
    method: 'GET',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    throw new Error(`Supabase 资源词法检索失败 ${resp.status} ${txt}`);
  }
  const data = await resp.json();
  return Array.isArray(data) ? data : [];
}

// 倒数排名融合（RRF）：多路召回按排名加权融合，提升精确命中项的排序。
// score(d) = Σ 1/(k + rank)，k 默认 60；同 id 跨路自动合并，优先采用带 link 的更完整对象。
function rrfFuse(rankedLists, k = 60) {
  const map = new Map();
  for (const list of rankedLists) {
    if (!Array.isArray(list)) continue;
    list.forEach((doc, i) => {
      if (doc == null || doc.id == null) return;
      const score = 1 / (k + i + 1);
      const cur = map.get(doc.id);
      if (!cur) {
        map.set(doc.id, { doc, score });
      } else {
        cur.score += score;
        if (doc.link != null) cur.doc = doc; // 后一路字段更全则用后一路
      }
    });
  }
  return Array.from(map.values())
    .sort((a, b) => b.score - a.score)
    .map((e) => e.doc);
}

// 资源站混合检索：向量召回（match_products RPC）+ 词法召回（ilike），RRF 融合后返回。
// queryText 缺省时退化为纯向量；任一路失败均优雅降级，不影响另一路结果。
async function retrieveResources(vector, queryText) {
  const embStr = '[' + vector.join(',') + ']';
  let vectorRows = [];
  try {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/match_products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify({
        query_embedding: embStr,
        match_threshold: 0,
        match_count: RAG_RERANK_CANDIDATES,
      }),
    });
    if (!resp.ok) {
      const txt = await resp.text().catch(() => '');
      throw new Error(`Supabase 资源检索失败 ${resp.status} ${txt}`);
    }
    const data = await resp.json();
    vectorRows = Array.isArray(data) ? data : [];
  } catch (e) {
    console.error('资源向量检索失败，降级为仅词法：', e?.message || e);
    vectorRows = [];
  }

  let lexRows = [];
  if (queryText && SUPABASE_URL && SUPABASE_KEY) {
    try {
      lexRows = await lexicalSearchProducts(queryText, RAG_RERANK_CANDIDATES);
    } catch (e) {
      console.error('资源词法检索失败，忽略：', e?.message || e);
      lexRows = [];
    }
  }

  if (vectorRows.length === 0 && lexRows.length === 0) return [];
  if (vectorRows.length === 0) return lexRows;
  if (lexRows.length === 0) return vectorRows;
  return rrfFuse([vectorRows, lexRows], 60).slice(0, RAG_RERANK_CANDIDATES);
}

// 发布/更新商品后自动生成向量写入 Supabase products.embedding（缺 SILICONFLOW_API_KEY 时优雅跳过）
async function embedProductForRag(apiKey, productId, name, description) {
  if (!apiKey || !productId) return;
  try {
    const vector = await embedQuery(apiKey, `${name || ''}\n${description || ''}`);
    await sbPatch('products', `id=eq.${productId}`, {
      embedding: '[' + vector.join(',') + ']',
    });
  } catch (e) {
    console.error('资源向量生成失败（已忽略，不影响发布）:', e?.message || e);
  }
}

async function rerankDocs(apiKey, query, docs, textOf) {
  const compose = textOf || ((d) => `${d.title}\n${d.body || ''}`);
  const documents = docs.map((d) => compose(d));
  const resp = await fetch(SILICONFLOW_RERANK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: RAG_RERANK_MODEL,
      query,
      documents,
      return_documents: false,
      top_n: docs.length,
    }),
  });
  if (!resp.ok) throw new Error(`重排失败 ${resp.status}`);
  const json = await resp.json();
  const results = Array.isArray(json?.results) ? json.results : [];
  // results 已按相关度降序；用 index 映射回原始 docs
  const ordered = results.map((r) => docs[r.index]).filter(Boolean);
  return ordered.length ? ordered : docs;
}

// 站内语义搜索：向量召回 + 重排，返回文章列表（含摘要）。复用 embedQuery / retrievePosts / rerankDocs。
async function handleSearch(request, env, url, path, method, origin) {
  const sfKey = env.SILICONFLOW_API_KEY;
  const neonUrl = env.NEON_SERVERLESS_URL;
  if (!sfKey || !neonUrl) {
    return err('服务端未配置 RAG 环境变量（SILICONFLOW_API_KEY / NEON_SERVERLESS_URL）', 503, origin);
  }
  if (method !== 'POST') return err('Method not allowed', 405, origin);

  const body = await request.json().catch(() => null);
  const query = (body && typeof body.query === 'string' ? body.query : '').trim();
  if (!query) return err('缺少查询词', 400, origin);
  const limit = Math.min(Math.max(parseInt((body && body.limit) || '', 10) || 8, 1), 20);

  try {
    const vec = await embedQuery(sfKey, query);
    let rows = await retrievePosts(neonUrl, vec);
    if (rows && rows.length > 1) {
      try {
        rows = await rerankDocs(sfKey, query, rows, (d) => `${d.title}\n${d.body || ''}`);
      } catch (e) {
        console.error('搜索 rerank 失败，回退向量排序：', e?.message || e);
      }
    }
    rows = (rows || []).slice(0, limit);
    const results = rows.map((r) => ({
      id: r.id,
      title: r.title,
      url: r.url,
      snippet: makeSnippet(r.body || '', query),
    }));
    return json({ results }, 200, origin);
  } catch (e) {
    console.error('语义搜索失败：', e?.message || e);
    return err(`语义搜索失败: ${e?.message || e}`, 500, origin);
  }
}

// 由正文 markdown 生成简短摘要：去 markdown 语法、压缩空白，并尽量截取含查询词的上下文窗口。
function makeSnippet(body, query, maxLen = 140) {
  let text = String(body || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_~`]/g, ' ')
    .replace(/&[a-z]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const tokens = query.split(/\s+/).map((t) => t.trim().toLowerCase()).filter((t) => t.length >= 2);
  let idx = -1;
  for (const tk of tokens) {
    const i = text.toLowerCase().indexOf(tk);
    if (i >= 0) { idx = i; break; }
  }
  if (idx < 0) return text.slice(0, maxLen) + (text.length > maxLen ? '…' : '');
  const start = Math.max(0, idx - 40);
  const end = Math.min(text.length, start + maxLen);
  return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
}

async function handleChatRag(request, env, url, path, method, origin) {
  const sfKey = env.SILICONFLOW_API_KEY;
  const neonUrl = env.NEON_SERVERLESS_URL;
  if (!sfKey || !neonUrl) {
    return err('服务端未配置 RAG 环境变量（SILICONFLOW_API_KEY / NEON_SERVERLESS_URL）', 503, origin);
  }
  if (method !== 'POST') return err('Method not allowed', 405, origin);

  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.messages)) return err('请求体格式错误', 400, origin);

  const messages = body.messages;
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  const queryText = extractText(lastUser?.content || '');
  if (!queryText.trim()) return err('缺少用户问题', 400, origin);

  // 「就这篇文章问 AI」范围模式：postScope.id 命中 rag_posts 时，直接以该文为唯一上下文，
  // 跳过嵌入与资源检索，专注本篇、更省 token；未命中则回退通用检索。
  let scopedPost = null;
  const postScope = body.postScope && typeof body.postScope === 'object' ? body.postScope : null;
  if (postScope && postScope.id) {
    await prewarmNeon(neonUrl); // 预热唤醒 compute，下方 scope 查询走同一热连接
    try {
      scopedPost = await getPostByScope(neonUrl, postScope.id, postScope.slug || '');
    } catch (e) {
      console.error('范围文章查询失败，回退通用检索：', e?.message || e);
    }
  }

  let rows = [];
  let resRows = [];

  if (scopedPost) {
    // 范围模式：只使用这篇文章作为上下文，跳过资源检索，专注本篇
    rows = [scopedPost];
  } else {
    let vector;
    const warmP = prewarmNeon(neonUrl); // 并发预热 Neon，与下面嵌入的联网耗时重叠
    try {
      vector = await cachedEmbedQuery(sfKey, queryText);
    } catch (e) {
      return err(`嵌入失败: ${e?.message || e}`, 502, origin);
    }
    await warmP; // 预热未完成则等它（通常已随嵌入完成）

    try {
      rows = (await retrievePosts(neonUrl, vector)) || [];
    } catch (e) {
      return err(`检索失败: ${e?.message || e}`, 502, origin);
    }

    // 资源站资源：独立检索 + 重排，失败不影响博客检索结果（优雅降级为仅文章回答）
    try {
      resRows = (await retrieveResources(vector, queryText)) || [];
    } catch (e) {
      console.error('资源检索失败，仅用博客文章回答：', e?.message || e);
      resRows = [];
    }
  }

  // 重排：用重排模型分别对两类候选精排，提升送入生成的相关性（失败则回退向量排序）
  try {
    if (rows.length > 1) rows = await rerankDocs(sfKey, queryText, rows, (d) => `${d.title}\n${d.body || ''}`);
  } catch (e) {
    console.error('博客 rerank 失败，回退向量排序：', e?.message || e);
  }
  rows = rows.slice(0, RAG_TOP_K);

  try {
    if (resRows.length > 1) resRows = await rerankDocs(sfKey, queryText, resRows, (d) => `${d.name}\n${d.description || ''}`);
  } catch (e) {
    console.error('资源 rerank 失败，回退向量排序：', e?.message || e);
  }
  resRows = resRows.slice(0, RAG_RESOURCE_TOP_K);

  // 博客文章上下文（喂完整正文，不截断）
  const postContext = rows.map((r, i) => {
    const alt = safeParseJSON(r.alternates, {});
    return `【博客文章 ${i + 1}】
标题：${r.title}
链接：${r.url}
多语言链接：${JSON.stringify(alt)}
正文：
${r.body || ''}`;
  }).join('\n\n');

  // 资源站资源上下文（名称/分类/网盘链接/描述）
  const resContext = resRows.map((r, i) => {
    return `【资源站资源 ${i + 1}】
名称：${r.name}
分类：${r.category || ''}
网盘类型：${r.cloud_type || ''}
分享链接：${r.link || ''}
描述：
${r.description || ''}`;
  }).join('\n\n');

  const context = [postContext, resContext].filter(Boolean).join('\n\n');

  // 范围模式：约束模型只依据当前文章作答，未涵盖时如实说明，避免编造/引用外部。
  const scopeNote = scopedPost
    ? '\n\n【回答范围限制】你只能依据下方【当前文章】的内容作答。若用户的问题超出该文章内容，请明确说明「这篇文章中没有提到这一点」，不要编造或引用其他来源。'
    : '';
  const systemPrompt = RAG_SYSTEM_PROMPT + scopeNote + '\n\n【检索到的站内资料】\n' + (context || '（未检索到相关文章与资源）');

  // 生成后端候选（按优先级顺序尝试，任一 200 即采用，非 200/异常自动顺延下一个；全部失败才 502）：
  //   ① 商汤 sensenova deepseek-v4-flash（免费额度大，作首选；多密钥轮询，全部密钥失败才顺延）
  //   ② ModelScope Llama-3.3-70B(免费/国内)
  //   ③ 智谱 GLM-4.7-Flash(永久免费/国内)
  //   ④ 硅基流动 DeepSeek(文本生成模型兜底，仅前面全挂才用)
  // 注：硅基流动的嵌入(bge-m3)/重排(bge-reranker)模型用于检索、同样免费且优先；此处只让其「文本/生成」模型排在生成链最后兜底。
  // （已移除 Groq：api.groq.com 在大陆边缘节点常被墙，导致流式错位/失败。）
  const genCandidates = [];
  // 0) 商汤 sensenova deepseek-v4-flash（生成首选）：SENSENOVA_API_KEYS 支持多把密钥（逗号/换行分隔），按顺序轮询——
  //    每一把密钥作为一个独立候选，依次尝试；只有「全部密钥」都返回非 200/异常，才顺延到下一个平台。
  const sensenovaKeys = (env.SENSENOVA_API_KEYS || '')
    .split(/[,\n]/).map(k => k.trim()).filter(Boolean);
  for (let i = 0; i < sensenovaKeys.length; i++) {
    genCandidates.push({
      tag: `Sensenova#${i + 1}`,
      url: RAG_GEN_URL_SENSENOVA,
      model: RAG_GEN_MODEL_SENSENOVA,
      auth: sensenovaKeys[i],
      // 强制关闭思考模式（reasoning_effort:none）：聊天首字更快、更省 token，避免把推理过程流式推给用户。
      extra: { reasoning_effort: 'none' },
    });
  }
  // 文本生成后端：其它家的免费文本模型优先，硅基流动的文本模型兜底（其嵌入/重排模型已用于检索且免费优先）。
  // 1) ModelScope Llama-3.3-70B（免费 2000次/天，国内直连）— 需 MODELSCOPE_API_KEY
  if (env.MODELSCOPE_API_KEY) {
    genCandidates.push({ tag: 'ModelScope', url: RAG_GEN_URL_MODELSCOPE, model: env.MODELSCOPE_MODEL || RAG_GEN_MODEL_MODELSCOPE, auth: env.MODELSCOPE_API_KEY });
  }
  // 2) 智谱 GLM-4.7-Flash（永久免费、国内直连、无需翻墙）— 需 ZHIPU_API_KEY
  // ⚠️ GLM-4.7 默认强制开启思维链(forced thinking)，且 reasoning 不通过独立 reasoning_content 字段返回，而是裹在 content 的 <think> 标签内——
  // 若不关闭，思考过程会被原样流式推给前端用户，既丑又费 token。故显式 thinking:{type:'disabled'} 关闭思考，只留干净正文。
  if (env.ZHIPU_API_KEY) {
    genCandidates.push({ tag: 'Zhipu', url: RAG_GEN_URL_ZHIPU, model: env.ZHIPU_MODEL || RAG_GEN_MODEL_ZHIPU, auth: env.ZHIPU_API_KEY, extra: { thinking: { type: 'disabled' } } });
  }
  // 3) 硅基流动 DeepSeek（文本/生成模型，留作最后兜底：前面免费文本后端全挂才用；嵌入/重排模型已用于检索且免费）。
  genCandidates.push({ tag: 'SiliconFlow', url: RAG_GEN_URL, model: RAG_GEN_MODEL, auth: sfKey });

  // 依次尝试各后端，任一成功(200)即用；非 200 或异常则尝试下一个
  let genResp = null;
  let usedTag = '';
  let usedModel = '';
  for (const c of genCandidates) {
    try {
      const r = await fetch(c.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${c.auth}` },
        body: JSON.stringify({
          model: c.model,
          messages: [{ role: 'system', content: systemPrompt }, ...messages],
          stream: true,
          temperature: 0.3,
          ...(c.extra || {}),
        }),
      });
      if (r.ok) { genResp = r; usedTag = c.tag; usedModel = c.model; break; }
      console.error(`[chat] ${c.tag} 生成返回 ${r.status}，回退下一个后端`);
    } catch (e) {
      console.error(`[chat] ${c.tag} 生成异常 ${e?.message || e}，回退下一个后端`);
    }
  }
  if (!genResp) return err('所有生成后端均不可用（Sensenova 全部密钥 / ModelScope / 智谱 / 硅基流动均失败）', 502, origin);
  console.log(`[chat] 生成模型: ${usedTag}:${usedModel}`);

  const respHeaders = new Headers();
  respHeaders.set('Content-Type', 'text/event-stream; charset=utf-8');
  respHeaders.set('Cache-Control', 'no-store');
  // 禁用中间代理/网关缓冲，确保 SSE 真正逐块下发给浏览器（否则 EdgeOne 等代理会把分块响应缓冲，
  // 超出缓冲/空闲阈值后直接断连，浏览器侧表现为 ERR_INCOMPLETE_CHUNKED_ENCODING）
  respHeaders.set('X-Accel-Buffering', 'no');
  const cors = getCorsHeaders(origin);
  for (const [k, v] of Object.entries(cors)) respHeaders.set(k, v);

  // 通过首方 ReadableStream 重新泵送上游流：
  // 部分边缘运行时对「直接返回外源 fetch 的 body」支持不佳/会被缓冲，导致 chunked 传输被截断；
  // 这里用 getReader() 逐块 enqueue，并让上游中断时干净收尾（controller.close），
  // 避免出现浏览器端的 ERR_INCOMPLETE_CHUNKED_ENCODING / network error。
  const reader = genResp.body.getReader();
  const stream = new ReadableStream({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) { controller.close(); return; }
        controller.enqueue(value);
      } catch (e) {
        console.error('chat stream pump error:', e?.message || e);
        try { controller.close(); } catch (_) {}
      }
    },
    cancel() { reader.cancel().catch(() => {}); },
  });

  return new Response(stream, { status: 200, headers: respHeaders });
}

// 注意：json 和 err 函数需要 origin 参数才能正确设置 CORS 头部
// 为了向后兼容，保持默认使用第一个允许的源，但推荐在 onRequest 中使用完整版本
function json(d, s=200, origin='') { 
  const headers = {'Content-Type':'application/json', ...getCorsHeaders(origin)};
  return new Response(JSON.stringify(d), {status:s, headers:headers}); 
}
function err(m, s=400, origin='') { return json({error:m}, s, origin); }

function jsonNoStore(d, s=200, origin='') {
  const headers = {'Content-Type':'application/json', 'Cache-Control': 'no-store', ...getCorsHeaders(origin)};
  return new Response(JSON.stringify(d), {status:s, headers:headers});
}

function parseRequestUrl(request) {
  const raw = request?.url;
  if (raw) {
    try {
      return new URL(raw);
    } catch {
      // EdgeOne may pass a path-only URL; fall through to host-based construction.
    }
  }
  const host = request.headers.get('x-forwarded-host')
    || request.headers.get('host')
    || 'www.qiyuan.icu';
  const proto = request.headers.get('x-forwarded-proto')
    || (host.includes('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https');
  const path = raw && raw.startsWith('/') ? raw : `/${raw || ''}`;
  return new URL(`${proto}://${host}${path}`);
}

function normalizeBaseUrl(input) {
  const raw = String(input || '').trim();
  if (!raw) return 'https://www.qiyuan.icu';
  try {
    return new URL(raw).origin;
  } catch {
    return 'https://www.qiyuan.icu';
  }
}

function apiUrl(path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${PUBLIC_BASE_URL}${normalizedPath}`;
}

// ---- R2 直传（S3 兼容，AWS SigV4，UNSIGNED-PAYLOAD）----
async function hmacSha256(key, msg) {
  const keyBytes = key instanceof Uint8Array ? key : new TextEncoder().encode(key);
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(msg));
  return new Uint8Array(sig);
}
async function getSignatureKey(secret, dateStamp, region, service) {
  const kDate = await hmacSha256('AWS4' + secret, dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  return hmacSha256(kService, 'aws4_request');
}
// 经 Cloudflare Worker（R2 绑定）直写 R2，无需 S3 密钥。
// Worker 由 X-Auth-Key 鉴权，自行生成文件名并返回绝对公开 URL（含 PUBLIC_URL）。
async function putViaWorker({ body, contentType }) {
  if (!UPLOAD_WORKER_URL || !UPLOAD_WORKER_KEY) {
    throw new Error('上传 Worker 未配置');
  }
  const resp = await fetch(UPLOAD_WORKER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': contentType || 'application/octet-stream',
      'X-Auth-Key': UPLOAD_WORKER_KEY,
    },
    body,
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    throw new Error(`上传 Worker 失败 ${resp.status} ${txt}`);
  }
  const data = await resp.json().catch(() => null);
  if (!data || !data.url) throw new Error('上传 Worker 返回异常');
  return { url: data.url, filename: data.filename || '' };
}

// 直传对象到 R2（Cloudflare S3 兼容端点），返回公开可读的绝对 URL
// 注意（2026-07-09）：当前无调用方 —— 评论图走 putViaWorker，资源图走 Supabase。
// S3 凭据历史上失效，此函数仅作 SigV4 参考保留，暂不接入任何上传路径。
async function putToR2({ key, body, contentType }) {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
    throw new Error('R2 环境变量未配置');
  }
  const host = `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const endpoint = `https://${host}/${R2_BUCKET}/${key}`;
  const amzDate = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const dateStamp = amzDate.slice(0, 8);
  const region = 'auto';
  const service = 's3';
  const payloadHash = 'UNSIGNED-PAYLOAD';
  const canonicalHeaders = `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest =
    `PUT\n/${R2_BUCKET}/${key}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign =
    `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${await sha256Hex(canonicalRequest)}`;
  const signingKey = await getSignatureKey(R2_SECRET_ACCESS_KEY, dateStamp, region, service);
  const signature = [...(await hmacSha256(signingKey, stringToSign))]
    .map((b) => b.toString(16).padStart(2, '0')).join('');
  const authorization =
    `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY_ID}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;
  const resp = await fetch(endpoint, {
    method: 'PUT',
    headers: {
      Host: host,
      'X-Amz-Date': amzDate,
      'X-Amz-Content-Sha256': payloadHash,
      'Content-Type': contentType || 'application/octet-stream',
      // 长缓存：商品封面图 key 唯一、几乎不变，交由 EdgeOne CDN + 浏览器长期缓存，
      // 大幅减少回源到 R2 的 GET（Class B 操作），进一步远离免费额度上限。
      'Cache-Control': 'public, max-age=31536000, immutable',
      Authorization: authorization,
    },
    body,
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    throw new Error(`R2 上传失败 ${resp.status} ${txt}`);
  }
  return { url: `${R2_PUBLIC_URL}/${key}`, filename: key };
}

// 资源站商品图专用上传（2026-07-09 边界确认）：只走 Supabase Storage（product-images 桶），
// 经 /api/images 反代对外。**不进 R2** —— R2 仅服务评论图（见 uploadCommentImageToR2）。
// 文章配图与其它站点图片保持各自原机制（Astro 本地静态资源等），也不经此函数。
async function uploadImageBuffer({ buffer, contentType, filename }) {
  // 1) 博客 /api/images/upload（有 PUBLISH_KEY 时）
  if (PUBLISH_KEY) {
    const response = await fetch(apiUrl('/api/images/upload'), {
      method: 'POST',
      headers: {
        'Content-Type': contentType || 'application/octet-stream',
        'X-Image-Name': filename,
        'X-PUBLISH-KEY': PUBLISH_KEY,
      },
      body: buffer,
    });
    if (response.ok) return response.json();
  }
  // 2) Supabase Storage（返回经 qiyuan.icu 反代的相对路径）
  const fallback = await fetch(`${SUPABASE_URL}/storage/v1/object/product-images/${filename}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': contentType || 'application/octet-stream',
    },
    body: buffer,
  });
  if (!fallback.ok) throw new Error('upload failed');
  return { url: `/api/images/${filename}`, filename };
}

// 评论图片专用上传（2026-07-09 边界确认）：**只走 R2**（经 Cloudflare Worker 绑定直写 r2.qiyuan.icu），
// 不落 Supabase。与资源站商品图（uploadImageBuffer → Supabase）职责彻底分离。
// Worker 未配置或失败即报错，不静默降级到其它图床，避免评论图混入资源图存储。
async function uploadCommentImageToR2({ buffer, contentType }) {
  if (!UPLOAD_WORKER_URL || !UPLOAD_WORKER_KEY) {
    throw new Error('评论图床（R2 Worker）未配置');
  }
  return await putViaWorker({ body: buffer, contentType });
}

async function sbGet(table, params='') {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' }
  });
  return r.json();
}
// 用 HEAD + count=exact 取过滤后的总行数（不传输数据，避免大表拉全量）
async function sbCount(table, params='') {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    method: 'HEAD',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Prefer': 'count=exact' }
  });
  const cr = r.headers.get('content-range'); // 形如 "0-9/57"
  if (!cr) return -1;
  const total = parseInt(cr.split('/')[1], 10);
  return isNaN(total) ? -1 : total;
}
async function sbPost(table, data) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST', headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' }, body: JSON.stringify(data)
  });
  return r.json();
}
async function sbPatch(table, match, data) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${match}`, {
    method: 'PATCH', headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' }, body: JSON.stringify(data)
  });
  return r.json();
}
async function sbDel(table, match) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${match}`, {
    method: 'DELETE', headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  return r.ok;
}

async function hashPw(pw) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pw));
  return Array.from(new Uint8Array(h)).map(b=>b.toString(16).padStart(2,'0')).join('');
}

async function sha256Hex(s) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(s)));
  return Array.from(new Uint8Array(h)).map(b=>b.toString(16).padStart(2,'0')).join('');
}

function base64Url(bytes) {
  const b64 = btoa(String.fromCharCode(...bytes));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function randomToken(prefix='mcp_', bytes=32) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return prefix + base64Url(arr);
}

async function getUserByMcpKey(key) {
  if (!key || typeof key !== 'string') return null;
  if (key.length < 20) return null;
  const prefix = key.slice(0, 24);
  const keyHash = await sha256Hex(key);
  const users = await sbGet('users', `mcp_key_prefix=eq.${prefix}&mcp_key_hash=eq.${keyHash}&mcp_key_revoked=is.false&select=id,username,email`);
  return Array.isArray(users) ? users[0] : null;
}

function encodeEqValue(value) {
  return encodeURIComponent(String(value));
}

async function getCategoryLabelMap() {
  try {
    const rows = await sbGet('resource_category_i18n', 'select=key,label_zh,label_en,label_ja');
    if (!Array.isArray(rows) || rows.code) return {};
    const map = {};
    for (const row of rows) {
      if (!row?.key) continue;
      map[row.key] = {
        zh: row.label_zh || row.key,
        en: row.label_en || row.label_zh || row.key,
        ja: row.label_ja || row.label_zh || row.key,
      };
    }
    return map;
  } catch {
    return {};
  }
}

function buildCategoryItem(key, labelMap) {
  const labels = labelMap[key];
  return {
    key,
    zh: labels?.zh || key,
    en: labels?.en || key,
    ja: labels?.ja || key,
  };
}

async function upsertCategoryLabels(key, labels = {}) {
  const categoryKey = String(key || '').trim();
  if (!categoryKey || categoryKey === 'all') return null;

  const zh = String(labels.zh || labels.label_zh || categoryKey).trim() || categoryKey;
  const en = String(labels.en || labels.label_en || zh).trim() || zh;
  const ja = String(labels.ja || labels.label_ja || zh).trim() || zh;
  const payload = {
    key: categoryKey,
    label_zh: zh,
    label_en: en,
    label_ja: ja,
    updated_at: new Date().toISOString(),
  };

  const existing = await sbGet('resource_category_i18n', `key=eq.${encodeEqValue(categoryKey)}&select=key`);
  if (Array.isArray(existing) && existing[0]) {
    return sbPatch('resource_category_i18n', `key=eq.${encodeEqValue(categoryKey)}`, payload);
  }
  return sbPost('resource_category_i18n', payload);
}

async function maybeUpsertCategoryLabels(args, category) {
  const hasLabels =
    args?.category_label_zh != null ||
    args?.category_label_en != null ||
    args?.category_label_ja != null ||
    args?.label_zh != null ||
    args?.label_en != null ||
    args?.label_ja != null;
  if (!hasLabels) return;
  await upsertCategoryLabels(category, {
    zh: args.category_label_zh ?? args.label_zh,
    en: args.category_label_en ?? args.label_en,
    ja: args.category_label_ja ?? args.label_ja,
  });
}

async function buildCategoriesResponse(productCategoryKeys) {
  const labelMap = await getCategoryLabelMap();
  const keys = [...new Set(productCategoryKeys.filter((c) => c && c !== 'NULL'))].sort();
  return keys.map((key) => buildCategoryItem(key, labelMap));
}

function mcpResult(id, result, origin='') {
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...getCorsHeaders(origin) };
  return new Response(JSON.stringify({ jsonrpc: '2.0', id: id ?? null, result }), { status: 200, headers });
}

function mcpError(id, code, message, origin='') {
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...getCorsHeaders(origin) };
  return new Response(JSON.stringify({ jsonrpc: '2.0', id: id ?? null, error: { code, message } }), { status: 200, headers });
}

function mcpToolText(payload) {
  return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }] };
}

function mcpTools() {
  return [
    {
      name: 'publish_product',
      description: '发布资源到博客资源站（支持多网盘链接，写入 products 表）',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          category: { type: 'string' },
          category_label_zh: { type: 'string' },
          category_label_en: { type: 'string' },
          category_label_ja: { type: 'string' },
          drive_link: { type: 'string' },
          link: { type: 'string' },
          quark_link: { type: 'string' },
          price: { type: 'number' },
          image_url: { type: 'string' },
          thumb_url: { type: 'string' },
          is_active: { type: 'boolean' }
        },
        required: ['name', 'image_url']
      }
    },
    {
      name: 'update_product',
      description: '更新商品（仅自己发布的）',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          description: { type: 'string' },
          category: { type: 'string' },
          category_label_zh: { type: 'string' },
          category_label_en: { type: 'string' },
          category_label_ja: { type: 'string' },
          drive_link: { type: 'string' },
          link: { type: 'string' },
          quark_link: { type: 'string' },
          price: { type: 'number' },
          image_url: { type: 'string' },
          thumb_url: { type: 'string' },
          is_active: { type: 'boolean' }
        },
        required: ['id']
      }
    },
    {
      name: 'delete_product',
      description: '删除商品（仅自己发布的）',
      inputSchema: {
        type: 'object',
        properties: { id: { type: 'integer' } },
        required: ['id']
      }
    },
    {
      name: 'list_products',
      description: '列出商品（公开列表或仅本人 mine=true）',
      inputSchema: {
        type: 'object',
        properties: {
          q: { type: 'string' },
          category: { type: 'string' },
          page: { type: 'integer' },
          limit: { type: 'integer' },
          mine: { type: 'boolean' }
        }
      }
    },
    {
      name: 'list_categories',
      description: '列出分类（来自上架商品，含多语言标签）',
      inputSchema: { type: 'object', properties: {} }
    },
    {
      name: 'search_products',
      description: '混合检索资源站资源（向量召回 match_products + 词法 ilike 双路，经 RRF 融合 + bge-reranker 精排）。对用户搜具体软件名 / 型号 / 提取码等精确词更稳。当用户想找某个软件 / 工具 / 教程 / 网盘资源时调用，返回最相关的资源（含网盘分享链接）。',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '自然语言检索词，如「AI 编程教程」「视频剪辑软件」' },
          category: { type: 'string', description: '可选分类过滤（中文，如 软件工具 / 学习资料），留空则不过滤' },
          top_k: { type: 'integer', description: '返回条数，默认 5，最大 10' }
        },
        required: ['query']
      }
    },
    {
      name: 'backfill_embeddings',
      description: '回填资源站历史商品的语义向量（云端执行，使用边缘函数自身的环境变量 SUPABASE_URL / SUPABASE_SERVICE_KEY / SILICONFLOW_API_KEY，无需本地密钥）。仅处理缺向量的商品（mode=missing）或全量重算（mode=all），每批有限条数，调用方循环调用直到 remaining=0 即可。这是一次性的历史数据初始化操作，与「发布/更新自动写入向量」互补。',
      inputSchema: {
        type: 'object',
        properties: {
          limit: { type: 'integer', description: '每批处理条数，默认 10，最大 30' },
          mode: { type: 'string', description: "missing=只补缺向量的商品（默认）；all=全量重算（忽略是否已存在向量）" }
        },
        required: []
      }
    },
    {
      name: 'upsert_category_labels',
      description: '写入/更新分类多语言显示名（无需重新部署前端）',
      inputSchema: {
        type: 'object',
        properties: {
          key: { type: 'string', description: '分类键，与 products.category 一致（中文）' },
          label_zh: { type: 'string' },
          label_en: { type: 'string' },
          label_ja: { type: 'string' },
        },
        required: ['key'],
      },
    },
    {
      name: 'upload_product_image_from_url',
      description: '从图片 URL 抓取并上传（返回 /api/images/...）',
      inputSchema: {
        type: 'object',
        properties: { source_url: { type: 'string' } },
        required: ['source_url']
      }
    },
    {
      name: 'upload_product_image',
      description: '直接上传图片数据（base64 编码）（返回 /api/images/...）',
      inputSchema: {
        type: 'object',
        properties: { 
          image_data: { type: 'string', description: 'Base64 编码的图片数据' },
          content_type: { type: 'string', description: '图片 MIME 类型（如 image/jpeg）' }
        },
        required: ['image_data', 'content_type']
      }
    },
    {
      name: 'health',
      description: '健康检查',
      inputSchema: { type: 'object', properties: {} }
    }
  ];
}

function safeFilename(name) {
  return String(name || '').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
}

function extFromContentType(contentType) {
  const ct = (contentType || '').toLowerCase();
  if (ct.includes('image/jpeg')) return 'jpg';
  if (ct.includes('image/png')) return 'png';
  if (ct.includes('image/webp')) return 'webp';
  if (ct.includes('image/gif')) return 'gif';
  if (ct.includes('image/avif')) return 'avif';
  return '';
}

async function genToken(uid, un) {
  const hdr = btoa(JSON.stringify({alg:'HS256',typ:'JWT'}));
  const pld = btoa(JSON.stringify({sub:uid,username:un,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+604800}));
  const msg = hdr+'.'+pld;
  const key = await crypto.subtle.importKey('raw',new TextEncoder().encode(JWT_SEC),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const sig = await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(msg));
  return msg+'.'+btoa(String.fromCharCode(...new Uint8Array(sig)));
}

async function vToken(tok) {
  try {
    const [h,p,s]=tok.split('.');
    const key = await crypto.subtle.importKey('raw',new TextEncoder().encode(JWT_SEC),{name:'HMAC',hash:'SHA-256'},false,['verify']);
    if(!await crypto.subtle.verify('HMAC',key,Uint8Array.from(atob(s),c=>c.charCodeAt(0)),new TextEncoder().encode(h+'.'+p))) return null;
    const pl=JSON.parse(atob(p));
    return pl.exp>Math.floor(Date.now()/1000)?pl:null;
  } catch { return null; }
}

async function getUser(req) {
  const a=req.headers.get('Authorization');
  return a?.startsWith('Bearer ')?await vToken(a.slice(7)):null;
}

function detectCloud(u) {
  if(!u) return null;
  const l=u.toLowerCase();
  // 国内网盘
  if(l.includes('quark.cn')||l.includes('pan.quark')||l.includes('quark.com')) return 'quark';
  if(l.includes('baidu.com')||l.includes('pan.baidu')||l.includes('yun.baidu')) return 'baidu';
  if(l.includes('aliyundrive')||l.includes('alipan')||l.includes('aliyundrive.net')) return 'aliyun';
  if(l.includes('lanzou')||l.includes('lanzoui')||l.includes('lanzoux')||l.includes('lanzouw')||l.includes('lanzouy')||l.includes('lzpan')) return 'lanzou';
  if(l.includes('ctfile.com')||l.includes('ctpan')||l.includes('ctfile.net')) return 'ctfile';
  if(l.includes('115.com')||l.includes('115网盘')||l.includes('115cdn')) return '115';
  if(l.includes('cloud.189.cn')||l.includes('ctyun')||l.includes('189.cn')) return 'tianyi';
  if(l.includes('weiyun')||l.includes('wo.cn')||l.includes('weiyun.com')) return 'weiyun';
  if(l.includes('nutstore')||l.includes('坚果云')||l.includes('jianguoyun')) return 'nutstore';
  if(l.includes('xunlei.com')||l.includes('pan.xunlei')||l.includes('xlpan.com')||l.includes('迅雷')) return 'xunlei';
  if(l.includes('guangya')||l.includes('guangyapan')||l.includes('光鸭')) return 'guangya';
  // 国际网盘
  if(l.includes('onedrive')||l.includes('1drv.com')||l.includes('sharepoint.com')||l.includes('1drv.ms')) return 'onedrive';
  if(l.includes('drive.google.com')||l.includes('docs.google.com')||l.includes('google.com/drive')) return 'gdrive';
  if(l.includes('mega.nz')||l.includes('mega.co.nz')||l.includes('mega.io')) return 'mega';
  if(l.includes('pcloud.com')||l.includes('pcloud.link')) return 'pcloud';
  if(l.includes('mediafire.com')||l.includes('mfire')) return 'mediafire';
  if(l.includes('wetransfer.com')||l.includes('we.tl')||l.includes('wetransfer.net')) return 'wetransfer';
  if(l.includes('box.com')||l.includes('box.net')) return 'box';
  if(l.includes('dropbox.com')||l.includes('db.tt')||l.includes('dropbox.link')) return 'dropbox';
  return null;
}

// ============================================================================
// KV 页面访问量统计（EdgeOne Pages KV）
// 需在 EdgeOne 控制台创建 KV 命名空间并绑定到本项目，变量名: qiyuan_kv
// KV key 仅支持数字、字母、下划线，因此路径需净化 + 哈希防冲突
// ============================================================================
const SITE_PV_KEY = 'pv_site_total';

function getKvNamespace(env) {
  try {
    // EdgeOne 将绑定的 KV 命名空间注入为全局变量
    // eslint-disable-next-line no-undef
    if (typeof qiyuan_kv !== 'undefined' && qiyuan_kv) return qiyuan_kv;
  } catch {}
  return env?.qiyuan_kv || null;
}

function normalizePvPath(input) {
  let p = String(input || '/').split('?')[0].split('#')[0];
  try { p = decodeURIComponent(p); } catch {}
  if (!p.startsWith('/')) p = `/${p}`;
  p = p.replace(/\/+$/, '') || '/';
  return p;
}

function hashPvPath(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

function pvKey(path) {
  const p = normalizePvPath(path);
  const safe = p.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 64);
  return `pv_${safe || 'home'}_${hashPvPath(p)}`;
}

async function handleViews(request, env, url, path, method, origin) {
  const kv = getKvNamespace(env);
  if (!kv) return err('服务端未绑定 KV 命名空间（请在 EdgeOne 控制台绑定，变量名 qiyuan_kv）', 503, origin);

  // GET /api/views/site → 全站访问量
  if (path === '/views/site' && method === 'GET') {
    const total = Number(await kv.get(SITE_PV_KEY)) || 0;
    return jsonNoStore({ views: total }, 200, origin);
  }

  // GET /api/views?path=/xxx → 查询指定页面访问量
  if (path === '/views' && method === 'GET') {
    const p = normalizePvPath(url.searchParams.get('path') || '/');
    const views = Number(await kv.get(pvKey(p))) || 0;
    return jsonNoStore({ path: p, views }, 200, origin);
  }

  // POST /api/views {path} → 页面访问量 +1（同时累加全站总量）
  if (path === '/views' && method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const p = normalizePvPath(body?.path || '/');
    const key = pvKey(p);
    const [cur, total] = await Promise.all([kv.get(key), kv.get(SITE_PV_KEY)]);
    const views = (Number(cur) || 0) + 1;
    const siteViews = (Number(total) || 0) + 1;
    await Promise.all([kv.put(key, String(views)), kv.put(SITE_PV_KEY, String(siteViews))]);
    return jsonNoStore({ path: p, views, siteViews }, 200, origin);
  }

  return err('Method not allowed', 405, origin);
}

// ============================================================================
// 自定义评论系统：评论记录存 Cloudflare KV，图片存 Cloudflare R2（各司其职）
// KV 经 Cloudflare REST API 访问（边缘函数跑在 EdgeOne，不能直接用 Worker 绑定）
// 需在 EdgeOne 配置：CF_KV_NAMESPACE_ID、CF_KV_API_TOKEN（CF_ACCOUNT_ID 有默认值）
// KV key 形如 comments:{slug} → JSON 数组；图片经 /comment-image 上传到 R2（Worker 直写）
// ============================================================================
function getCfKv(env) {
  const account = env.CF_ACCOUNT_ID || CF_ACCOUNT_ID || '';
  const ns = env.CF_KV_NAMESPACE_ID || CF_KV_NAMESPACE_ID || '';
  const token = env.CF_KV_API_TOKEN || CF_KV_API_TOKEN || '';
  if (!account || !ns || !token) return null;
  const base = `https://api.cloudflare.com/client/v4/accounts/${account}/storage/kv/namespaces/${ns}`;
  return {
    async get(key) {
      const r = await fetch(`${base}/values/${encodeURIComponent(key)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.status === 404) return null;
      if (!r.ok) {
        const t = await r.text().catch(() => '');
        throw new Error(`KV get ${key} -> ${r.status} ${t}`);
      }
      return await r.text();
    },
    async put(key, value, opts) {
      const ttl = opts && opts.expirationTtl;
      const qs = Number.isFinite(ttl) && ttl > 0 ? `?expirationTtl=${encodeURIComponent(ttl)}` : '';
      const r = await fetch(`${base}/values/${encodeURIComponent(key)}${qs}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'text/plain' },
        body: value,
      });
      if (!r.ok) {
        const t = await r.text().catch(() => '');
        throw new Error(`KV put ${key} -> ${r.status} ${t}`);
      }
      return true;
    },
    async list(prefix) {
      const r = await fetch(`${base}/keys?limit=1000${prefix ? `&prefix=${encodeURIComponent(prefix)}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) {
        const t = await r.text().catch(() => '');
        throw new Error(`KV list ${prefix || ''} -> ${r.status} ${t}`);
      }
      const j = await r.json();
      return Array.isArray(j?.result) ? j.result.map((k) => k.name) : [];
    },
    async del(key) {
      const r = await fetch(`${base}/values/${encodeURIComponent(key)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      return r.ok;
    },
  };
}

// ---- 短链服务（Short URL） ----
// 存储：Cloudflare KV（与评论共用命名空间，前缀 short:）；key = short:<slug>
const SHORT_PREFIX = 'short:';
const SHORT_ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
function genShortSlug(len = 6) {
  const buf = new Uint8Array(len);
  globalThis.crypto.getRandomValues(buf);
  let s = '';
  for (let i = 0; i < len; i++) s += SHORT_ALPHABET[buf[i] % SHORT_ALPHABET.length];
  return s;
}

async function handleShorten(request, env, url, path, method, origin) {
  const kv = getCfKv(env);
  if (!kv) return err('服务端未配置 Cloudflare KV', 503, origin);
  if (method !== 'POST') return err('方法不允许', 405, origin);
  let body;
  try {
    body = await request.json();
  } catch {
    return err('请求体无效', 400, origin);
  }
  const target = String(body?.url || '').trim();
  if (!target) return err('请提供目标链接', 400, origin);
  let parsed;
  try {
    parsed = new URL(target);
  } catch {
    return err('链接格式不正确', 400, origin);
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return err('仅支持 http/https 链接', 400, origin);
  }
  // 可选自定义短码
  let slug = String(body?.slug || '').trim();
  if (slug) {
    if (!/^[a-zA-Z0-9_-]{3,32}$/.test(slug)) return err('自定义短码仅限字母数字 _ -，长度 3-32', 400, origin);
    const exist = await kv.get(SHORT_PREFIX + slug);
    if (exist) return err('该短码已被占用', 409, origin);
  } else {
    let ok = false;
    for (let i = 0; i < 6; i++) {
      const candidate = genShortSlug(6);
      const exist = await kv.get(SHORT_PREFIX + candidate);
      if (!exist) {
        slug = candidate;
        ok = true;
        break;
      }
    }
    if (!ok) return err('生成短码失败，请重试', 500, origin);
  }
  const rec = JSON.stringify({ url: target, createdAt: new Date().toISOString() });
  await kv.put(SHORT_PREFIX + slug, rec);
  const shortUrl = `${url.origin}/api/s/${slug}`;
  return jsonNoStore({ slug, shortUrl, url: target }, 200, origin);
}

async function handleShortRedirect(request, env, url, slug, origin) {
  const kv = getCfKv(env);
  if (!kv) return new Response('服务端未配置 Cloudflare KV', { status: 503 });
  const raw = await kv.get(SHORT_PREFIX + slug);
  if (!raw) {
    return new Response('短链不存在或已失效', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
  let target = raw;
  try {
    target = JSON.parse(raw).url || raw;
  } catch {
    /* 旧格式兼容：直接存的是 URL 文本 */
  }
  return new Response(null, {
    status: 302,
    headers: { Location: target, 'Cache-Control': 'no-store' },
  });
}

function commentKey(slug) {
  return `comments:${String(slug || '').replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 200)}`;
}

function newCommentId() {
  try {
    return globalThis.crypto.randomUUID();
  } catch {
    return `c_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }
}

async function handleComments(request, env, url, path, method, origin) {
  const kv = getCfKv(env);
  if (!kv) return err('服务端未配置 Cloudflare KV（CF_KV_NAMESPACE_ID / CF_KV_API_TOKEN）', 503, origin);

  if (method === 'GET') {
    const slug = url.searchParams.get('slug');
    if (!slug) return err('缺少 slug', 400, origin);
    let list = [];
    try {
      const raw = await kv.get(commentKey(slug));
      if (raw) list = JSON.parse(raw);
    } catch {
      list = [];
    }
    if (!Array.isArray(list)) list = [];
    list = list.filter((c) => c && c.status !== 'spam');
    return jsonNoStore({ comments: list }, 200, origin);
  }

  // POST：新增评论
  const body = await request.json().catch(() => ({}));
  const slug = body?.slug;
  if (!slug) return err('缺少 slug', 400, origin);
  // 蜜罐：机器人常填隐藏字段，直接假装成功但不存储
  if (body?.hp) return jsonNoStore({ ok: true, comment: null }, 200, origin);

  const content = String(body?.content || '').trim();
  if (!content) return err('评论内容不能为空', 400, origin);
  if (content.length > 2000) return err('评论内容过长（最多 2000 字）', 400, origin);

  const comment = {
    id: newCommentId(),
    parent_id: body?.parent_id || null,
    content,
    status: 'approved',
    created_at: new Date().toISOString(),
  };

  // 读-改-写（KV 最终一致，低频并发可接受最后写入获胜）
  const key = commentKey(slug);
  let list = [];
  try {
    const raw = await kv.get(key);
    if (raw) list = JSON.parse(raw);
  } catch {}
  if (!Array.isArray(list)) list = [];
  list.push(comment);
  await kv.put(key, JSON.stringify(list));

  return jsonNoStore({ ok: true, comment }, 200, origin);
}

async function handleCommentImage(request, env, url, path, method, origin) {
  const buf = await request.arrayBuffer();
  const contentType = request.headers.get('Content-Type') || 'application/octet-stream';
  if (!contentType.startsWith('image/')) return err('仅支持图片文件', 400, origin);
  if (buf.byteLength > 10 * 1024 * 1024) return err('图片过大（最大 10MB）', 400, origin);
  // 评论图只走 R2（Worker 自行命名并返回绝对 URL）；未配置/失败则返回 503，不落 Supabase。
  let res;
  try {
    res = await uploadCommentImageToR2({ buffer: buf, contentType });
  } catch (e) {
    return err('评论图上传失败：' + (e?.message || 'R2 未就绪'), 503, origin);
  }
  return json({ url: res.url, filename: res.filename }, 200, origin);
}

// ============================================================================
// 公开网盘（/api/drive/*）：浏览器经 S3 presigned PUT 直传 R2，文件元数据存 Cloudflare KV
//   POST /drive/upload-init     {filename,size,contentType} → {uploadUrl,token,publicUrl,shareUrl,fileTtlHours}
//   POST /drive/upload-complete {token} → {ok,publicUrl,shareUrl,filename,size}
//   GET  /drive/list            → {files:[{token,filename,size,contentType,createdAt,expiresAt,url}]}
//   GET  /drive/meta/:token     → {file:{...}}（分享页用）
// 前置：R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY（重新生成的有效 S3 凭据）/ R2_ACCOUNT_ID / R2_BUCKET / R2_PUBLIC_URL；
//       CF_KV_*（元数据）。公开上传不再做人机验证。
// 文件对象 key = drive/<token>；公开读 URL = {R2_PUBLIC_URL}/drive/<token>（经 EdgeOne 回源，国内稳）；
// 上传走 S3 presigned PUT，主机 <accountId>.r2.cloudflarestorage.com（Cloudflare 直连，单次 PUT 大文件无限制）。
// 【24h 自动删除】元数据写 KV 时带 expirationTtl（默认 24h，env.DRIVE_TTL_HOURS 可改）；upload-complete 重写时
//   必须重新带 TTL 否则会被清空。list/download/preview/meta 均主动按 expiresAt 拦截过期文件。
//   ⚠️ R2 实体对象不会因 KV 过期而消失，需在 Cloudflare 控制台给桶 qiyuan 加 Lifecycle 规则
//      （前缀 drive/，1 天后过期）才能真正清理 R2 存储，否则只是"列表/下载不可见"但对象仍在。
// ============================================================================
const DRIVE_PREFIX = 'drive/';
const DRIVE_DEFAULT_MAX_BYTES = 500 * 1024 * 1024; // 单文件默认上限 500MB，可由 env.DRIVE_MAX_BYTES 覆盖

function driveMaxBytes(env) {
  const v = parseInt((env && env.DRIVE_MAX_BYTES) || '0', 10);
  return v > 0 ? v : DRIVE_DEFAULT_MAX_BYTES;
}

// 文件存活时长（秒），默认 24h，可由 env.DRIVE_TTL_HOURS 覆盖。到期自动删除。
function driveTtlSeconds(env) {
  const h = parseInt((env && env.DRIVE_TTL_HOURS) || '0', 10);
  return (h > 0 ? h : 24) * 3600;
}

// 元数据是否已过期（主动拦截，不依赖 KV 清理延迟）
function driveIsExpired(meta, now = Date.now()) {
  return !!(meta && meta.expiresAt && new Date(meta.expiresAt).getTime() <= now);
}

function newDriveToken() {
  try {
    return globalThis.crypto.randomUUID().replace(/-/g, '');
  } catch {
    return `f${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  }
}

function clientIpOf(request) {
  return (
    request.headers.get('EO-Connecting-IP') ||
    (request.headers.get('X-Forwarded-For') || '').split(',')[0].trim() ||
    request.headers.get('CF-Connecting-IP') ||
    ''
  );
}

// 生成 R2 S3 presigned PUT URL（浏览器直传，单次 PUT，UNSIGNED-PAYLOAD，仅签 host）。
// 复用文件内已有的 hmacSha256 / getSignatureKey / sha256Hex（R2 直传那段定义）。
async function presignR2Put({ accountId, accessKey, secretKey, bucket, objectKey, expires = 600 }) {
  const host = `${accountId}.r2.cloudflarestorage.com`;
  const region = 'auto';
  const service = 's3';
  const now = new Date();
  const amzDate = now.toISOString().replace(/-/g, '').replace(/:/g, '').replace(/\.\d{3}/, ''); // 20260710T084542Z
  const dateStamp = amzDate.slice(0, 8);
  const credential = `${accessKey}/${dateStamp}/${region}/${service}/aws4_request`;
  const qp = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': credential,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(expires),
    'X-Amz-SignedHeaders': 'host',
  };
  const enc = (s) => encodeURIComponent(s);
  const canonicalQuery = Object.keys(qp).sort().map((k) => `${enc(k)}=${enc(qp[k])}`).join('&');
  const canonicalUri = `/${enc(bucket)}/${objectKey.split('/').map(enc).join('/')}`;
  const canonicalHeaders = `host:${host}\n`;
  const canonicalRequest = `PUT\n${canonicalUri}\n${canonicalQuery}\n${canonicalHeaders}\nhost\nUNSIGNED-PAYLOAD`;
  const hashedCanonical = await sha256Hex(canonicalRequest);
  const scope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${scope}\n${hashedCanonical}`;
  const signingKey = await getSignatureKey(secretKey, dateStamp, region, service);
  const sigBytes = await hmacSha256(signingKey, stringToSign);
  const signature = [...sigBytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `https://${host}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

async function handleDrive(request, env, url, path, method, origin) {
  const kv = getCfKv(env);
  if (!kv) return err('服务端未配置 Cloudflare KV（CF_KV_NAMESPACE_ID / CF_KV_API_TOKEN）', 503, origin);

  // POST /drive/upload-init：校验 → 生成 token + presigned PUT URL → 元数据落 KV（pending）
  if (path === '/drive/upload-init' && method === 'POST') {
    if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_ACCOUNT_ID || !R2_BUCKET) {
      return err('服务端未配置 R2 S3 凭据（R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_ACCOUNT_ID / R2_BUCKET），请重新生成有效 Token', 503, origin);
    }
    const body = await request.json().catch(() => ({}));
    const filename = String(body?.filename || '').trim().slice(0, 200);
    const size = parseInt(body?.size, 10);
    const contentType = String(body?.contentType || 'application/octet-stream').slice(0, 200);
    if (!filename) return err('缺少文件名', 400, origin);
    if (!Number.isFinite(size) || size <= 0) return err('文件大小无效', 400, origin);
    const maxB = driveMaxBytes(env);
    if (size > maxB) return err(`文件过大（上限 ${Math.round(maxB / 1024 / 1024)}MB）`, 400, origin);

    const token = newDriveToken();
    const objectKey = DRIVE_PREFIX + token;
    const ttl = driveTtlSeconds(env);
    let uploadUrl;
    try {
      uploadUrl = await presignR2Put({ accountId: R2_ACCOUNT_ID, accessKey: R2_ACCESS_KEY_ID, secretKey: R2_SECRET_ACCESS_KEY, bucket: R2_BUCKET, objectKey, expires: 600 });
    } catch (e) {
      return err('生成上传地址失败：' + (e?.message || e), 500, origin);
    }
    const publicUrl = `${R2_PUBLIC_URL}/${objectKey}`;
    const now = Date.now();
    const meta = {
      token,
      objectKey,
      filename,
      size,
      contentType,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + ttl * 1000).toISOString(),
      ip: clientIpOf(request),
      ready: false,
    };
    try {
      await kv.put(`drive:${token}`, JSON.stringify(meta), { expirationTtl: ttl });
    } catch (e) {
      return err('元数据写入失败：' + (e?.message || e), 500, origin);
    }
    return jsonNoStore({ uploadUrl, token, publicUrl, shareUrl: publicUrl, expires: 600, fileTtlHours: ttl / 3600 }, 200, origin);
  }

  // POST /drive/upload-complete：浏览器 PUT 完成后回填，标记 ready（信任客户端，省去 HEAD 签名）
  if (path === '/drive/upload-complete' && method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const token = String(body?.token || '').trim();
    if (!token) return err('缺少 token', 400, origin);
    const raw = await kv.get(`drive:${token}`);
    if (!raw) return err('文件不存在或已过期', 404, origin);
    let meta; try { meta = JSON.parse(raw); } catch { meta = {}; }
    meta.ready = true;
    const ttl = driveTtlSeconds(env);
    meta.expiresAt = new Date(Date.now() + ttl * 1000).toISOString();
    await kv.put(`drive:${token}`, JSON.stringify(meta), { expirationTtl: ttl });
    const pub = `${R2_PUBLIC_URL}/${DRIVE_PREFIX}${token}`;
    return jsonNoStore({ ok: true, publicUrl: pub, shareUrl: pub, filename: meta.filename, size: meta.size }, 200, origin);
  }

  // GET /drive/list：列出已上传（ready）的文件
  if (path === '/drive/list' && method === 'GET') {
    const now = Date.now();
    const files = [];
    try {
      const names = await kv.list('drive:');
      for (const name of names) {
        const raw = await kv.get(name);
        if (!raw) continue;
        let m; try { m = JSON.parse(raw); } catch { continue; }
        if (!m || m.ready === false) continue;
        // 主动过滤已过期条目（不依赖 KV 清理延迟）；旧文件无 expiresAt 时按 createdAt+24h 推算
        const effExpire = m.expiresAt
          ? new Date(m.expiresAt).getTime()
          : m.createdAt
            ? new Date(m.createdAt).getTime() + 24 * 3600 * 1000
            : 0;
        if (effExpire && effExpire <= now) continue;
        files.push({
          token: m.token,
          filename: m.filename,
          size: m.size,
          contentType: m.contentType,
          createdAt: m.createdAt,
          expiresAt: m.expiresAt,
          url: `${R2_PUBLIC_URL}/${DRIVE_PREFIX}${m.token}`,
        });
      }
    } catch (e) {
      return err('列表读取失败：' + (e?.message || e), 500, origin);
    }
    files.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    return jsonNoStore({ files }, 200, origin);
  }

  // GET /drive/meta/:token：单文件元数据（分享页）
  if (path.startsWith('/drive/meta/') && method === 'GET') {
    const token = path.slice('/drive/meta/'.length).trim();
    if (!token) return err('缺少 token', 400, origin);
    const raw = await kv.get(`drive:${token}`);
    if (!raw) return err('文件不存在或已过期', 404, origin);
    let m; try { m = JSON.parse(raw); } catch { m = {}; }
    if (driveIsExpired(m)) return err('文件已过期（24 小时后自动删除）', 410, origin);
    return jsonNoStore({ file: { ...m, url: `${R2_PUBLIC_URL}/${DRIVE_PREFIX}${m.token}` } }, 200, origin);
  }

  // GET /drive/download?token=：同源下载代理（强制 Content-Disposition: attachment，恢复原名）
  // 直链 r2.qiyuan.icu 是跨域，浏览器会忽略 <a download>，故走同源函数代理触发真正下载
  if (path === '/drive/download' && method === 'GET') {
    const token = (url.searchParams.get('token') || '').trim();
    if (!/^[a-f0-9]{8,}$/i.test(token)) return err('非法 token', 400, origin);
    const raw = await kv.get(`drive:${token}`);
    if (!raw) return err('文件不存在或已过期', 404, origin);
    let meta; try { meta = JSON.parse(raw); } catch { meta = {}; }
    if (meta.ready === false) return err('文件尚未就绪', 409, origin);
    if (driveIsExpired(meta)) return err('文件已过期（24 小时后自动删除）', 410, origin);
    const upstream = `${R2_PUBLIC_URL}/${DRIVE_PREFIX}${token}`;
    const upRes = await fetch(upstream);
    if (!upRes.ok) return err('源文件读取失败', 502, origin);
    const fname = meta.filename || token;
    const safeAscii = fname.replace(/["\\\r\n]/g, '_');
    const cd = `attachment; filename="${safeAscii}"; filename*=UTF-8''${encodeURIComponent(fname)}`;
    return new Response(upRes.body, {
      status: 200,
      headers: {
        'Content-Type': meta.contentType || upRes.headers.get('Content-Type') || 'application/octet-stream',
        'Content-Disposition': cd,
        'Cache-Control': 'public, max-age=3600',
        ...getCorsHeaders(origin),
      },
    });
  }

  // GET /drive/preview?token=：同源**内联**预览代理（Content-Disposition: inline）
  // 与 /drive/download 唯一区别：disposition 用 inline，供 <img>/<video>/<audio>/<iframe>(PDF) 内联渲染，
  // 不会触发浏览器下载。鉴权/读取逻辑完全一致。
  if (path === '/drive/preview' && method === 'GET') {
    const token = (url.searchParams.get('token') || '').trim();
    if (!/^[a-f0-9]{8,}$/i.test(token)) return err('非法 token', 400, origin);
    const raw = await kv.get(`drive:${token}`);
    if (!raw) return err('文件不存在或已过期', 404, origin);
    let meta; try { meta = JSON.parse(raw); } catch { meta = {}; }
    if (meta.ready === false) return err('文件尚未就绪', 409, origin);
    if (driveIsExpired(meta)) return err('文件已过期（24 小时后自动删除）', 410, origin);
    const upstream = `${R2_PUBLIC_URL}/${DRIVE_PREFIX}${token}`;
    const upRes = await fetch(upstream);
    if (!upRes.ok) return err('源文件读取失败', 502, origin);
    const fname = meta.filename || token;
    const safeAscii = fname.replace(/["\\\r\n]/g, '_');
    const cdInline = `inline; filename="${safeAscii}"; filename*=UTF-8''${encodeURIComponent(fname)}`;
    return new Response(upRes.body, {
      status: 200,
      headers: {
        'Content-Type': meta.contentType || upRes.headers.get('Content-Type') || 'application/octet-stream',
        'Content-Disposition': cdInline,
        'Cache-Control': 'public, max-age=3600',
        ...getCorsHeaders(origin),
      },
    });
  }

  return err('Not found', 404, origin);
}

export default async function onRequest(context) {
  const request = context.request;
  const env = context.env || {};
  SUPABASE_URL = env.SUPABASE_URL || '';
  SUPABASE_KEY = env.SUPABASE_SERVICE_KEY || '';
  JWT_SEC = env.JWT_SECRET || '';
  PUBLIC_BASE_URL = normalizeBaseUrl(env.PUBLIC_BASE_URL || 'https://www.qiyuan.icu');
  PUBLISH_KEY = String(env.PUBLISH_KEY || '').trim();
  R2_ACCOUNT_ID = env.R2_ACCOUNT_ID || '';
  R2_ACCESS_KEY_ID = env.R2_ACCESS_KEY_ID || '';
  R2_SECRET_ACCESS_KEY = env.R2_SECRET_ACCESS_KEY || '';
  R2_BUCKET = env.R2_BUCKET || '';
  R2_PUBLIC_URL = (env.R2_PUBLIC_URL || 'https://r2.qiyuan.icu').replace(/\/$/, '');
  UPLOAD_WORKER_URL = (env.UPLOAD_WORKER_URL || '').replace(/\/$/, '');
  UPLOAD_WORKER_KEY = env.UPLOAD_WORKER_KEY || '';
  CF_ACCOUNT_ID = env.CF_ACCOUNT_ID || 'fd8407455495209c315b0086c9ec1877';
  CF_KV_NAMESPACE_ID = env.CF_KV_NAMESPACE_ID || '';
  CF_KV_API_TOKEN = env.CF_KV_API_TOKEN || '';
  // 临时邮箱可选域名列表：优先 env.TEMP_MAIL_DOMAINS（逗号分隔），否则单域名 env.TEMP_MAIL_DOMAIN，再否则用默认三域名
  if (env.TEMP_MAIL_DOMAINS) {
    TEMP_MAIL_DOMAINS = env.TEMP_MAIL_DOMAINS.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  } else if (env.TEMP_MAIL_DOMAIN) {
    TEMP_MAIL_DOMAINS = [env.TEMP_MAIL_DOMAIN.trim().toLowerCase()];
  } else {
    TEMP_MAIL_DOMAINS = DEFAULT_TEMP_MAIL_DOMAINS.slice();
  }
  CF_D1_API_TOKEN = env.CF_D1_API_TOKEN || '';
  TEMP_MAIL_D1_ID = env.TEMP_MAIL_D1_ID || '';
  const url = parseRequestUrl(request);
  const path = url.pathname.replace(/^\/api/, '');
  const method = request.method;
  const origin = request.headers.get('Origin') || '';
  
  if(method==='OPTIONS') return new Response(null,{status:204,headers:getCorsHeaders(origin)});

  // AI 站内助手：RAG 管线（硅基流动 + Neon 文章 + Supabase 资源 + DeepSeek），见 handleChatRag
  if(path.startsWith('/chat-api')) {
    try {
      return await handleChatRag(request, env, url, path, method, origin);
    } catch(e) {
      return err(`AI 助手失败: ${e?.message || e}`, 502, origin);
    }
  }

  // 站内语义搜索（向量召回 + 重排）：POST /search { query, limit? } → { results:[{id,title,url,snippet}] }
  if (path === '/search' && method === 'POST') {
    try {
      return await handleSearch(request, env, url, path, method, origin);
    } catch (e) {
      return err(`语义搜索失败: ${e?.message || e}`, 500, origin);
    }
  }

  // 自定义评论系统：GET/POST /comments（存 Cloudflare KV）+ POST /comment-image（图片存 R2）
  if (path === '/comments' && (method === 'GET' || method === 'POST')) {
    try {
      return await handleComments(request, env, url, path, method, origin);
    } catch (e) {
      return err(`评论操作失败: ${e?.message || e}`, 500, origin);
    }
  }
  if (path === '/comment-image' && method === 'POST') {
    try {
      return await handleCommentImage(request, env, url, path, method, origin);
    } catch (e) {
      return err(`图片上传失败: ${e?.message || e}`, 500, origin);
    }
  }

  // 短链服务：POST /api/shorten 创建；GET /api/s/:slug → 302 跳转
  if (path === '/shorten' && method === 'POST') {
    try {
      return await handleShorten(request, env, url, path, method, origin);
    } catch (e) {
      return err(`短链创建失败: ${e?.message || e}`, 500, origin);
    }
  }
  const sMatch = path.match(/^\/s\/([a-zA-Z0-9_-]+)$/);
  if (sMatch && method === 'GET') {
    try {
      return await handleShortRedirect(request, env, url, sMatch[1], origin);
    } catch (e) {
      return err(`短链跳转失败: ${e?.message || e}`, 500, origin);
    }
  }

  // 公开网盘：S3 presigned 直传 R2 + KV 元数据
  if (path.startsWith('/drive')) {
    try {
      return await handleDrive(request, env, url, path, method, origin);
    } catch (e) {
      return err(`网盘操作失败: ${e?.message || e}`, 500, origin);
    }
  }

  // 临时邮箱（白嫖免费域名 + Cloudflare Email Routing + D1）：生成地址 / 读信箱 / 读单封
  if (path === '/temp-mail/address' && method === 'POST') {
    try {
      return await handleTempMailAddress(request, env, origin);
    } catch (e) {
      return err(`生成临时邮箱失败: ${e?.message || e}`, 500, origin);
    }
  }
  if (path === '/temp-mail/messages' && method === 'GET') {
    try {
      return await handleTempMailMessages(request, env, url, origin);
    } catch (e) {
      return err(`读取邮件列表失败: ${e?.message || e}`, 500, origin);
    }
  }
  if (path === '/temp-mail/message' && method === 'GET') {
    try {
      return await handleTempMailMessage(request, env, url, origin);
    } catch (e) {
      return err(`读取邮件失败: ${e?.message || e}`, 500, origin);
    }
  }

  // KV 访问量统计路由（不依赖 Supabase，需放在数据库环境变量检查之前）
  if(path==='/views' || path==='/views/site') {
    try {
      return await handleViews(request, env, url, path, method, origin);
    } catch(e) {
      return err(`KV 访问量统计失败: ${e?.message || e}`, 500, origin);
    }
  }

  if(!SUPABASE_URL || !SUPABASE_KEY) {
    return err('服务端未配置数据库环境变量（SUPABASE_URL / SUPABASE_SERVICE_KEY）', 503, origin);
  }

  try {
    // Blog-only publish shortcut:
    // POST /api/publish with header X-PUBLISH-KEY to create a product
    // Uses old MCP style ownership: key -> user, then write user_id.
    if(path==='/publish' && method==='POST') {
      if(!PUBLISH_KEY) return err('服务端未配置 PUBLISH_KEY', 503, origin);
      const key = String(request.headers.get('X-PUBLISH-KEY') || '').trim();
      if(!key || key !== PUBLISH_KEY) return err('Unauthorized', 401, origin);
      const u = await getUserByMcpKey(key);
      if(!u) return err('无效的 PUBLISH_KEY（请使用有效的 MCP Key）',401,origin);

      const args = await request.json().catch(() => null);
      if(!args || typeof args !== 'object') return err('请求体必须是 JSON 对象',400,origin);
      const pname = String(args.name || '').trim();
      if(!pname) return err('name is required',400,origin);
      const imageUrl = args.image_url == null ? '' : String(args.image_url).trim();
      if(!imageUrl) return err('image_url is required',400,origin);
      const link = String(args.drive_link || args.link || args.quark_link || args.pan_link || args.cloud_link || '').trim();
      if(!link) return err('drive_link is required',400,origin);
      const category = (args.category && String(args.category).trim()) ? String(args.category).trim() : 'all';

      const insertData = {
        name: pname,
        description: args.description == null ? null : String(args.description),
        category: category,
        image_url: imageUrl,
        thumb_url: args.thumb_url ? String(args.thumb_url) : null,
        quark_link: link,
        cloud_type: detectCloud(link),
        price: args.price == null ? 0.00 : Number(args.price),
        is_active: args.is_active == null ? true : !!args.is_active,
        user_id: u.id
      };
      delete insertData.id;
      await maybeUpsertCategoryLabels(args, category);
      const result = await sbPost('products', insertData);
      if(result && result.code) return err(`Create failed: ${result.message||'unknown'}`,500,origin);
      const created = Array.isArray(result)?result[0]:result;
      // 自动生成向量写入 Supabase（供站内 RAG / search_products 检索；缺 key 则跳过）
      await embedProductForRag(env.SILICONFLOW_API_KEY, created?.id, pname, args.description);
      return jsonNoStore({ message: 'published', product: created }, 200, origin);
    }

    if(path==='/mcp/key' && method==='POST') {
      const b = await request.json();
      const username = (b.username || '').trim();
      const password = b.password || '';
      const force = !!b.force;
      if(!username || !password) return err('请输入用户名和密码', 400, origin);

      const users = await sbGet('users', `or=(username.eq.${username},email.eq.${username})&select=id,username,email,password_hash,mcp_key_hash,mcp_key_prefix,mcp_key_revoked`);
      const user = Array.isArray(users) ? users[0] : null;
      if(!user) return err('用户名或密码错误', 401, origin);
      if(await hashPw(password) !== user.password_hash) return err('用户名或密码错误', 401, origin);

      if(user.mcp_key_hash && !user.mcp_key_revoked && user.mcp_key_prefix && !force) {
        return jsonNoStore({
          message: '已存在 MCP Key（请在客户端保存你的 Key；如需重置请传 force=true）'
        }, 200, origin);
      }

      const key = randomToken('mcp_', 32);
      const keyHash = await sha256Hex(key);
      const prefix = key.slice(0, 24);
      const patched = await sbPatch('users', `id=eq.${user.id}`, { mcp_key_hash: keyHash, mcp_key_prefix: prefix, mcp_key_created_at: new Date().toISOString(), mcp_key_revoked: false });
      if(patched?.code) return err('生成 MCP Key 失败', 500, origin);

      return jsonNoStore({
        mcp_key: key,
        mcp_url: apiUrl(`/api/mcp/${key}`)
      }, 200, origin);
    }

    if(path==='/mcp/status' && method==='GET') {
      const au = await getUser(request);
      if(!au) return err('未登录', 401, origin);
      const users = await sbGet('users', `id=eq.${au.sub}&select=id,username,mcp_key_hash,mcp_key_prefix,mcp_key_created_at,mcp_key_revoked`);
      const user = Array.isArray(users) ? users[0] : null;
      if(!user) return err('用户不存在', 404, origin);
      const hasKey = !!user.mcp_key_hash && !user.mcp_key_revoked;
      const prefix = user.mcp_key_prefix || null;
      const masked = (hasKey && prefix) ? apiUrl(`/api/mcp/${prefix}...`) : null;
      return jsonNoStore({
        user: { id: user.id, username: user.username },
        has_key: hasKey,
        key_prefix: prefix,
        key_created_at: user.mcp_key_created_at || null,
        mcp_url_masked: masked,
        mcp_url_template: apiUrl('/api/mcp/<YOUR_MCP_KEY>')
      }, 200, origin);
    }

    if(path==='/mcp/rotate' && method==='POST') {
      const au = await getUser(request);
      if(!au) return err('未登录', 401, origin);
      const users = await sbGet('users', `id=eq.${au.sub}&select=id`);
      const user = Array.isArray(users) ? users[0] : null;
      if(!user) return err('用户不存在', 404, origin);
      const key = randomToken('mcp_', 32);
      const keyHash = await sha256Hex(key);
      const prefix = key.slice(0, 24);
      const patched = await sbPatch('users', `id=eq.${user.id}`, { mcp_key_hash: keyHash, mcp_key_prefix: prefix, mcp_key_created_at: new Date().toISOString(), mcp_key_revoked: false });
      if(patched?.code) return err('生成 MCP Key 失败', 500, origin);
      return jsonNoStore({ mcp_key: key, mcp_url: apiUrl(`/api/mcp/${key}`) }, 200, origin);
    }

    if(path.startsWith('/mcp/publish/')&&method==='POST'){
      const key = path.slice('/mcp/publish/'.length);
      const u = await getUserByMcpKey(key);
      if(!u) return err('无效的 MCP Key',401,origin);
      const args = await request.json().catch(() => null);
      if(!args || typeof args !== 'object') return err('请求体必须是 JSON 对象',400,origin);
      const pname = String(args.name || '').trim();
      if(!pname) return err('name is required',400,origin);
      const imageUrl = args.image_url == null ? '' : String(args.image_url).trim();
      if(!imageUrl) return err('image_url is required',400,origin);
      const link = String(args.drive_link || args.link || args.quark_link || args.pan_link || args.cloud_link || '').trim();
      if(!link) return err('drive_link is required',400,origin);
      const category = (args.category && String(args.category).trim()) ? String(args.category).trim() : 'all';
      const insertData = {
        name: pname,
        description: args.description == null ? null : String(args.description),
        category: category,
        image_url: imageUrl,
        thumb_url: args.thumb_url ? String(args.thumb_url) : null,
        quark_link: link,
        cloud_type: detectCloud(link),
        price: args.price == null ? 0.00 : Number(args.price),
        is_active: args.is_active == null ? true : !!args.is_active,
        user_id: u.id
      };
      delete insertData.id;
      await maybeUpsertCategoryLabels(args, category);
      const result = await sbPost('products', insertData);
      if(result && result.code) return err(`Create failed: ${result.message||'unknown'}`,500,origin);
      const created = Array.isArray(result)?result[0]:result;
      // 自动生成向量写入 Supabase（供站内 RAG / search_products 检索；缺 key 则跳过）
      await embedProductForRag(env.SILICONFLOW_API_KEY, created?.id, pname, args.description);
      return jsonNoStore({
        message: 'published',
        endpoint: apiUrl(`/api/mcp/publish/${key}`),
        product: created
      },200,origin);
    }

    if(path.startsWith('/mcp/upload/')&&method==='POST'){
      const key = path.slice('/mcp/upload/'.length);
      const u = await getUserByMcpKey(key);
      if(!u) return err('无效的 MCP Key',401,origin);
      const fd=await request.formData();
      const file=fd.get('file');
      if(!file) return err('未选择文件',400,origin);
      if(file.size>5*1024*1024) return err('文件不能超5MB',400,origin);
      if(!file.type.startsWith('image/')) return err('只支持图片文件',400,origin);
      const ext=extFromContentType(file.type) || file.name.split('.').pop()||'jpg';
      const fn=`product_${Date.now()}_${Math.random().toString(36).slice(2,10)}.${ext}`;
      const buf=await file.arrayBuffer();
      try {
        const uploaded = await uploadImageBuffer({
          buffer: buf,
          contentType: file.type || 'application/octet-stream',
          filename: fn,
        });
        return json({ url: uploaded.url, filename: uploaded.filename }, 200, origin);
      } catch {
        return err('上传失败', 500, origin);
      }
    }

    if(path.startsWith('/mcp/') && method==='POST') {
      const key = path.slice('/mcp/'.length);
      const u = await getUserByMcpKey(key);
      if(!u) return mcpError(null, -32001, 'Unauthorized: invalid MCP key', origin);

      const body = await request.json().catch(() => null);
      if(!body || body.jsonrpc !== '2.0') return mcpError(null, -32600, 'Invalid Request', origin);

      const id = body.id ?? null;
      const m = body.method;
      const params = body.params || {};

      if(m === 'initialize') {
        return mcpResult(id, {
          serverInfo: { name: 'qiyuan.icu', version: '1.0.0' },
          capabilities: { tools: {} }
        }, origin);
      }

      if(m === 'tools/list') {
        return mcpResult(id, { tools: mcpTools() }, origin);
      }

      if(m === 'tools/call') {
        const toolName = params.name;
        const args = params.arguments || {};

        if(toolName === 'health') {
          return mcpResult(id, mcpToolText({ ok: true, user: { id: u.id, username: u.username } }), origin);
        }

        if(toolName === 'list_categories') {
          const data=await sbGet('products','select=category&is_active=eq.true');
          const keys=(Array.isArray(data)?data:[]).map(p=>p.category);
          const categories = await buildCategoriesResponse(keys);
          return mcpResult(id, mcpToolText({ categories }), origin);
        }

        if(toolName === 'search_products') {
          const q = String(args.query || '').trim();
          if(!q) return mcpError(id, -32602, 'query is required', origin);
          const sfKey = env.SILICONFLOW_API_KEY;
          if(!sfKey) return mcpError(id, -32000, '服务端未配置 RAG 环境变量（SILICONFLOW_API_KEY）', origin);
          const topK = Math.min(Math.max(parseInt(args.top_k || '5'), 1), 10);
          const category = (args.category || '').trim();
          try {
            const vector = await embedQuery(sfKey, q);
            let rows = (await retrieveResources(vector, q)) || [];
            if(category && category !== 'all') rows = rows.filter((r) => r.category === category);
            if(rows.length > 1) rows = await rerankDocs(sfKey, q, rows, (d) => `${d.name}\n${d.description || ''}`);
            rows = rows.slice(0, topK);
            const products = rows.map((r) => ({
              id: r.id,
              name: r.name,
              description: r.description || '',
              category: r.category || '',
              cloud_type: r.cloud_type || '',
              link: r.link || '',
              image_url: r.image_url || ''
            }));
            return mcpResult(id, mcpToolText({ query: q, count: products.length, products }), origin);
          } catch (e) {
            return mcpError(id, -32000, `检索失败: ${e?.message || e}`, origin);
          }
        }

        if(toolName === 'backfill_embeddings') {
          const sfKey = env.SILICONFLOW_API_KEY;
          if(!sfKey) return mcpError(id, -32000, '服务端未配置 SILICONFLOW_API_KEY，无法生成向量', origin);
          if(!SUPABASE_URL || !SUPABASE_KEY) return mcpError(id, -32000, '服务端未配置 Supabase 环境变量', origin);
          const limit = Math.min(Math.max(parseInt(args.limit || '10'), 1), 30);
          const mode = (args.mode === 'all') ? 'all' : 'missing';
          const filter = mode === 'missing' ? 'embedding=is.null' : 'embedding=not.is.null';
          try {
            const rows = (await sbGet('products',
              `select=id,name,description&${filter}&order=id.asc&limit=${limit}`)) || [];
            let processed = 0;
            for (const r of rows) {
              await embedProductForRag(sfKey, r.id, r.name, r.description);
              processed++;
            }
            const remaining = await sbCount('products', mode === 'missing' ? 'embedding=is.null' : 'embedding=not.is.null');
            return mcpResult(id, mcpToolText({
              mode,
              batch_limit: limit,
              processed,
              remaining,
              done: remaining === 0,
              hint: remaining > 0 ? '再次调用本工具继续处理下一批，直到 remaining=0' : '全部商品向量已就绪'
            }), origin);
          } catch (e) {
            return mcpError(id, -32000, `回填失败: ${e?.message || e}`, origin);
          }
        }

        if(toolName === 'upsert_category_labels') {
          const categoryKey = String(args.key || '').trim();
          if(!categoryKey) return mcpError(id, -32602, 'key is required', origin);
          const result = await upsertCategoryLabels(categoryKey, {
            zh: args.label_zh,
            en: args.label_en,
            ja: args.label_ja,
          });
          if(result && result.code) return mcpError(id, -32013, `Upsert failed: ${result.message||'unknown'}`, origin);
          const labelMap = await getCategoryLabelMap();
          return mcpResult(id, mcpToolText({ category: buildCategoryItem(categoryKey, labelMap) }), origin);
        }

        if(toolName === 'list_products') {
          const q = (args.q || '').trim();
          const category = (args.category || '').trim();
          const mine = !!args.mine;
          const pg = parseInt(args.page || '1');
          const lm = parseInt(args.limit || '20');
          const pageNum = Number.isFinite(pg) && pg > 0 ? pg : 1;
          const limitNum = Number.isFinite(lm) && lm > 0 && lm <= 100 ? lm : 20;

          let paramsStr = `order=created_at.desc&offset=${(pageNum-1)*limitNum}&limit=${limitNum}`;
          if(mine) paramsStr = `user_id=eq.${u.id}&` + paramsStr;
          else paramsStr = `is_active=eq.true&` + paramsStr;
          if(q) paramsStr += `&or=(name.ilike.%25${q}%25,description.ilike.%25${q}%25)`;
          if(category && category !== 'all') paramsStr += `&category=eq.${category}`;
          const data = await sbGet('products', paramsStr);
          return mcpResult(id, mcpToolText({ products: Array.isArray(data)?data:[], page: pageNum, limit: limitNum }), origin);
        }

        if(toolName === 'upload_product_image_from_url') {
          const sourceUrl = String(args.source_url || '').trim();
          if(!sourceUrl) return mcpError(id, -32602, 'source_url is required', origin);

          const r = await fetch(sourceUrl, { method: 'GET' });
          if(!r.ok) return mcpError(id, -32002, `Image fetch failed: ${r.status}`, origin);
          const ct = r.headers.get('content-type') || '';
          const cl = r.headers.get('content-length');
          if(cl && Number(cl) > 5*1024*1024) return mcpError(id, -32002, 'Image too large', origin);
          const buf = await r.arrayBuffer();
          if(buf.byteLength > 5*1024*1024) return mcpError(id, -32002, 'Image too large', origin);
          if(ct && !ct.toLowerCase().startsWith('image/')) return mcpError(id, -32002, 'Not an image', origin);

          const ext = extFromContentType(ct);
          const fn = safeFilename(`product_${Date.now()}_${Math.random().toString(36).slice(2,10)}${ext?'.'+ext:''}`);
          try {
            const uploaded = await uploadImageBuffer({
              buffer: buf,
              contentType: ct || 'application/octet-stream',
              filename: fn,
            });
            return mcpResult(id, mcpToolText({ url: uploaded.url, filename: uploaded.filename }), origin);
          } catch {
            return mcpError(id, -32003, 'Upload failed', origin);
          }
        }

        if(toolName === 'upload_product_image') {
          const imageData = String(args.image_data || '').trim();
          const contentType = String(args.content_type || '').trim();
          
          if(!imageData) return mcpError(id, -32602, 'image_data is required', origin);
          if(!contentType) return mcpError(id, -32602, 'content_type is required', origin);
          
          if(!contentType.toLowerCase().startsWith('image/')) return mcpError(id, -32002, 'Not an image', origin);
          
          let base64Data = imageData;
          if(base64Data.includes(',')) {
            base64Data = base64Data.split(',')[1];
          }
          
          let buf;
          try {
            const binaryString = atob(base64Data);
            const uint8Array = new Uint8Array(binaryString.length);
            for(let i = 0; i < binaryString.length; i++) {
              uint8Array[i] = binaryString.charCodeAt(i);
            }
            buf = uint8Array.buffer;
          } catch(e) {
            return mcpError(id, -32002, 'Invalid base64 data', origin);
          }
          
          if(buf.byteLength > 5*1024*1024) return mcpError(id, -32002, 'Image too large', origin);
          
          const ext = extFromContentType(contentType);
          const fn = safeFilename(`product_${Date.now()}_${Math.random().toString(36).slice(2,10)}${ext?'.'+ext:''}`);
          try {
            const uploaded = await uploadImageBuffer({
              buffer: buf,
              contentType,
              filename: fn,
            });
            return mcpResult(id, mcpToolText({ url: uploaded.url, filename: uploaded.filename }), origin);
          } catch {
            return mcpError(id, -32003, 'Upload failed', origin);
          }
        }

        if(toolName === 'publish_product') {
          const pname = String(args.name || '').trim();
          if(!pname) return mcpError(id, -32602, 'name is required', origin);
          const imageUrl = args.image_url == null ? '' : String(args.image_url).trim();
          if(!imageUrl) return mcpError(id, -32602, 'image_url is required', origin);
          const link = String(args.drive_link || args.link || args.quark_link || args.pan_link || args.cloud_link || '').trim();
          if(!link) return mcpError(id, -32602, 'drive_link is required', origin);
          const category = (args.category && String(args.category).trim()) ? String(args.category).trim() : 'all';
          const insertData = {
            name: pname,
            description: args.description == null ? null : String(args.description),
            category: category,
            image_url: imageUrl,
            thumb_url: args.thumb_url ? String(args.thumb_url) : null,
            quark_link: link,
            cloud_type: detectCloud(link),
            price: args.price == null ? 0.00 : Number(args.price),
            is_active: args.is_active == null ? true : !!args.is_active,
            user_id: u.id
          };
          delete insertData.id;
          await maybeUpsertCategoryLabels(args, category);
          const result = await sbPost('products', insertData);
          if(result && result.code) return mcpError(id, -32010, `Create failed: ${result.message||'unknown'}`, origin);
          const created = Array.isArray(result) ? result[0] : result;
          // 自动生成向量写入 Supabase（供站内 RAG / search_products 检索；缺 key 则跳过）
          await embedProductForRag(env.SILICONFLOW_API_KEY, created?.id, pname, args.description);
          return mcpResult(id, mcpToolText({ product: created }), origin);
        }

        if(toolName === 'update_product') {
          const pid = Number(args.id);
          if(!Number.isFinite(pid)) return mcpError(id, -32602, 'id is required', origin);
          const ex = await sbGet('products',`id=eq.${pid}&select=user_id`);
          const e = Array.isArray(ex)?ex[0]:null;
          if(!e || e.user_id !== u.id) return mcpError(id, -32011, 'Forbidden', origin);
          const patch = {};
          if(args.name != null) patch.name = String(args.name).trim();
          if(args.description != null) patch.description = String(args.description);
          if(args.category != null) patch.category = (String(args.category).trim() || 'all');
          if(args.price != null) patch.price = Number(args.price);
          if(args.image_url != null) {
            const imageUrl = String(args.image_url).trim();
            if(!imageUrl) return mcpError(id, -32602, 'image_url cannot be empty', origin);
            patch.image_url = imageUrl;
          }
          if(args.thumb_url != null) patch.thumb_url = String(args.thumb_url);
          if(args.is_active != null) patch.is_active = !!args.is_active;
          const newLink = (args.drive_link != null || args.link != null || args.quark_link != null || args.pan_link != null || args.cloud_link != null)
            ? String(args.drive_link || args.link || args.quark_link || args.pan_link || args.cloud_link || '').trim()
            : '';
          if(newLink) {
            patch.quark_link = newLink;
            patch.cloud_type = detectCloud(newLink);
          } else if (args.drive_link != null || args.link != null || args.quark_link != null || args.pan_link != null || args.cloud_link != null) {
            return mcpError(id, -32602, 'drive_link cannot be empty', origin);
          }
          const result = await sbPatch('products', `id=eq.${pid}`, patch);
          if(result && result.code) return mcpError(id, -32012, `Update failed: ${result.message||'unknown'}`, origin);
          // 名称/描述变更时重新生成向量（供站内 RAG / search_products 检索）
          if(args.name != null || args.description != null) {
            await embedProductForRag(env.SILICONFLOW_API_KEY, pid, args.name, args.description);
          }
          return mcpResult(id, mcpToolText({ product: Array.isArray(result)?result[0]:result }), origin);
        }

        if(toolName === 'delete_product') {
          const pid = Number(args.id);
          if(!Number.isFinite(pid)) return mcpError(id, -32602, 'id is required', origin);
          const ex = await sbGet('products',`id=eq.${pid}&select=user_id`);
          const e = Array.isArray(ex)?ex[0]:null;
          if(!e || e.user_id !== u.id) return mcpError(id, -32011, 'Forbidden', origin);
          await sbDel('reviews', `product_id=eq.${pid}`);
          await sbDel('products', `id=eq.${pid}`);
          return mcpResult(id, mcpToolText({ ok: true, id: pid }), origin);
        }

        return mcpError(id, -32601, 'Tool not found', origin);
      }

      return mcpError(id, -32601, 'Method not found', origin);
    }

    if(path==='/auth/login'&&method==='POST'){
      const{username,password}=await request.json();
      if(!username||!password) return err('请输入用户名和密码', 400, origin);
      const users=await sbGet('users',`or=(username.eq.${username},email.eq.${username})`);
      const user=Array.isArray(users)?users[0]:null;
      if(!user) return err('用户名或密码错误',401, origin);
      if(await hashPw(password)!==user.password_hash) return err('用户名或密码错误',401, origin);
      return json({token:await genToken(user.id,user.username),user:{id:user.id,username:user.username,email:user.email}}, 200, origin);
    }
    if(path==='/auth/register'&&method==='POST'){
      const{username,email,password,confirm_password}=await request.json();
      if(!username||!email||!password) return err('请填写所有字段', 400, origin);
      if(password!==confirm_password) return err('密码不一致', 400, origin);
      if(username.length<3) return err('用户名至少3位', 400, origin);
      if(!/[A-Z]/.test(password)) return err('密码需包含至少一个大写字母', 400, origin);
      if(!/[a-z]/.test(password)) return err('密码需包含至少一个小写字母', 400, origin);
      if(!/[0-9]/.test(password)) return err('密码需包含至少一个数字', 400, origin);
      if(!/[^A-Za-z0-9]/.test(password)) return err('密码需包含至少一个符号', 400, origin);
      const ex=await sbGet('users',`or=(username.eq.${username},email.eq.${email})`);
      if(Array.isArray(ex)&&ex.length>0) return err('用户名或邮箱已注册', 400, origin);
      const u=await sbPost('users',{username,email,password_hash:await hashPw(password)});
      if(u.code) return err('注册失败',500, origin);
      const user=Array.isArray(u)?u[0]:u;
      if(!user||!user.id) return err('注册失败',500, origin);
      return json({token:await genToken(user.id,user.username),user:{id:user.id,username:user.username,email:user.email}}, 200, origin);
    }
    if(path==='/auth/me'&&method==='GET'){
      const u=await getUser(request);
      if(!u) return err('未登录',401, origin);
      const users=await sbGet('users',`id=eq.${u.sub}&select=id,username,email,created_at`);
      return json({user:Array.isArray(users)?users[0]:null}, 200, origin);
    }
    if(path==='/auth/logout'&&method==='POST') return json({message:'已退出'}, 200, origin);
    if(path==='/auth/change-password'&&method==='POST'){
      const u=await getUser(request); if(!u) return err('请先登录',401, origin);
      const{current_password,new_password,confirm_password}=await request.json();
      if(!current_password||!new_password) return err('请填写所有字段', 400, origin);
      if(!/[A-Z]/.test(new_password)) return err('新密码需包含至少一个大写字母', 400, origin);
      if(!/[a-z]/.test(new_password)) return err('新密码需包含至少一个小写字母', 400, origin);
      if(!/[0-9]/.test(new_password)) return err('新密码需包含至少一个数字', 400, origin);
      if(!/[^A-Za-z0-9]/.test(new_password)) return err('新密码需包含至少一个符号', 400, origin);
      if(new_password!==confirm_password) return err('新密码不一致', 400, origin);
      const users=await sbGet('users',`id=eq.${u.sub}&select=id,password_hash`);
      const user=Array.isArray(users)?users[0]:null;
      if(!user) return err('用户不存在',404, origin);
      if(await hashPw(current_password)!==user.password_hash) return err('当前密码错误',401, origin);
      if(await hashPw(new_password)===user.password_hash) return err('新密码不能与旧密码相同', 400, origin);
      await sbPatch('users',`id=eq.${u.sub}`,{password_hash:await hashPw(new_password)});
      return json({message:'密码修改成功'}, 200, origin);
    }

    if(path==='/categories'&&method==='GET'){
      const uid = (url.searchParams.get('uid') || '').trim();
      let params = 'select=category&is_active=eq.true';
      if(uid) params += `&user_id=eq.${uid}`;
      const data=await sbGet('products',params);
      const keys=(Array.isArray(data)?data:[]).map(p=>p.category);
      const categories = await buildCategoriesResponse(keys);
      return json({categories}, 200, origin);
    }
    if(path==='/products'&&method==='GET'){
      const q=url.searchParams.get('q')||'',cat=url.searchParams.get('cat')||'',all=url.searchParams.get('all');
      const uid=(url.searchParams.get('uid')||'').trim();
      const pg=parseInt(url.searchParams.get('page')||'1'),lm=parseInt(url.searchParams.get('limit')||'20');
      let params=`order=created_at.desc&offset=${(pg-1)*lm}&limit=${lm}`;
      if(all!=='1') params=`is_active=eq.true&`+params;
      else{
        const u=await getUser(request); if(!u) return err('请先登录',401, origin);
        params=`user_id=eq.${u.sub}&`+params;
      }
      if(all!=='1' && uid) params = `user_id=eq.${uid}&` + params;
      if(q) params+=`&or=(name.ilike.%25${q}%25,description.ilike.%25${q}%25)`;
      if(cat&&cat!=='all') params+=`&category=eq.${cat}`;
      const data=await sbGet('products',params);
      return json({products:Array.isArray(data)?data:[],total:Array.isArray(data)?data.length:0,page:pg,limit:lm}, 200, origin);
    }
    if(path.match(/^\/products\/\d+$/)&&method==='GET'){
      const id=path.split('/')[2];
      const prods=await sbGet('products',`id=eq.${id}`);
      const p=Array.isArray(prods)?prods[0]:null;
      if(!p) return err('商品不存在',404, origin);
      // 增加访问量
      await sbPatch('products', `id=eq.${id}`, { view_count: (p.view_count || 0) + 1 });
      const rv=await sbGet('reviews',`product_id=eq.${id}&order=created_at.desc`);
      return json({product:{...p, view_count: (p.view_count || 0) + 1},reviews:Array.isArray(rv)?rv:[]}, 200, origin);
    }
    if(path==='/products'&&method==='POST'){
      const u=await getUser(request); if(!u) return err('请先登录',401, origin);
      const b=await request.json();
      if(!b.name) return err('请输入商品名称', 400, origin);
      if(!b.quark_link || !String(b.quark_link).trim()) return err('请输入网盘链接', 400, origin);
      if(!b.image_url || !String(b.image_url).trim()) return err('请上传商品图片', 400, origin);
      // 处理 category 字段：空字符串或 null 时使用默认值 'all'
      const category = (b.category && b.category.trim()) ? b.category : 'all';
      // 构建要插入的数据，确保不包含 id 字段（安全第一）
      const insertData = {
        name: b.name,
        description: b.description,
        category: category,
        image_url: String(b.image_url).trim(),
        thumb_url: b.thumb_url || null,
        quark_link: String(b.quark_link).trim(),
        cloud_type: detectCloud(String(b.quark_link).trim()),
        price: b.price || 0.00,
        is_active: b.is_active !== undefined ? b.is_active : true,
        user_id: u.sub
      };
      // 双重保险：明确删除任何可能存在的 id 字段
      delete insertData.id;
      const result=await sbPost('products', insertData);
      if(result && result.code) {
        console.error('Supabase error:', result);
        let errorMsg = '创建商品失败';
        if(result.message) {
          errorMsg += ': ' + result.message;
        }
        return err(errorMsg, 500, origin);
      }
      const p=Array.isArray(result)?result[0]:result;
      return json({product:p}, 200, origin);
    }
    if(path.match(/^\/products\/\d+$/)&&method==='PUT'){
      const u=await getUser(request); if(!u) return err('请先登录',401, origin);
      const id=path.split('/')[2];
      const ex=await sbGet('products',`id=eq.${id}&select=user_id`);
      const e=Array.isArray(ex)?ex[0]:null;
      if(!e||e.user_id!==u.sub) return err('无权修改',403, origin);
      const b=await request.json();
      const updateData = {...b};
      if(b.quark_link) updateData.cloud_type=detectCloud(b.quark_link);
      if(b.quark_link !== undefined && !String(b.quark_link || '').trim()) return err('请输入网盘链接', 400, origin);
      if(b.image_url !== undefined && !String(b.image_url || '').trim()) return err('请上传商品图片', 400, origin);
      // 处理 category 字段
      if(b.category !== undefined) {
        updateData.category = (b.category && b.category.trim()) ? b.category : 'all';
      }
      const result=await sbPatch('products',`id=eq.${id}`,updateData);
      if(result.code) return err('更新商品失败: ' + (result.message || JSON.stringify(result)),500, origin);
      // 名称/描述变更时重新生成向量（供站内 RAG / search_products 检索；缺 key 则跳过）
      if(b.name != null || b.description != null) {
        await embedProductForRag(env.SILICONFLOW_API_KEY, id, b.name, b.description);
      }
      return json({product:Array.isArray(result)?result[0]:result}, 200, origin);
    }
    if(path.match(/^\/products\/\d+$/)&&method==='DELETE'){
      const u=await getUser(request); if(!u) return err('请先登录',401, origin);
      const id=path.split('/')[2];
      const ex=await sbGet('products',`id=eq.${id}&select=user_id`);
      const e=Array.isArray(ex)?ex[0]:null;
      if(!e||e.user_id!==u.sub) return err('无权删除',403, origin);
      await sbDel('reviews',`product_id=eq.${id}`);
      await sbDel('products',`id=eq.${id}`);
      return json({message:'已删除'}, 200, origin);
    }
    if(path.match(/^\/products\/\d+\/toggle$/)&&method==='POST'){
      const u=await getUser(request); if(!u) return err('请先登录',401, origin);
      const id=path.split('/')[2];
      const ex=await sbGet('products',`id=eq.${id}&select=user_id,is_active`);
      const e=Array.isArray(ex)?ex[0]:null;
      if(!e||e.user_id!==u.sub) return err('无权修改',403, origin);
      const result=await sbPatch('products',`id=eq.${id}`,{is_active:!e.is_active});
      return json({product:Array.isArray(result)?result[0]:result}, 200, origin);
    }
    if(path.match(/^\/products\/\d+\/reviews$/)&&method==='GET'){
      const id=path.split('/')[2];
      const rv=await sbGet('reviews',`product_id=eq.${id}&order=created_at.desc`);
      return json({reviews:Array.isArray(rv)?rv:[]}, 200, origin);
    }
    if(path.match(/^\/products\/\d+\/reviews$/)&&method==='POST'){
      const u=await getUser(request); if(!u) return err('请先登录',401, origin);
      const id=path.split('/')[2];
      const b=await request.json();
      if(!b.rating||b.rating<1||b.rating>5) return err('评分1-5', 400, origin);
      const un=await sbGet('users',`id=eq.${u.sub}&select=username`);
      const uname=Array.isArray(un)&&un[0]?un[0].username:'';
      const result=await sbPost('reviews',{product_id:parseInt(id),user_id:u.sub,username:uname,rating:b.rating,content:b.content||''});
      return json({review:Array.isArray(result)?result[0]:result}, 200, origin);
    }
    if(path==='/upload'&&method==='POST'){
        const u=await getUser(request); if(!u) return err('请先登录',401,origin);
        const fd=await request.formData();
        const file=fd.get('file');
        if(!file) return err('未选择文件',400,origin);
        if(file.size>5*1024*1024) return err('文件不能超5MB',400,origin);
        const ext=file.name.split('.').pop()||'jpg';
        const fn=`product_${Date.now()}_${Math.random().toString(36).slice(2,10)}.${ext}`;
        const buf=await file.arrayBuffer();
        try {
          const uploaded = await uploadImageBuffer({
            buffer: buf,
            contentType: file.type || 'application/octet-stream',
            filename: fn,
          });
          return json({ url: uploaded.url, filename: uploaded.filename }, 200, origin);
        } catch {
          return err('上传失败', 500, origin);
        }
    }

    // 图片读取由 cloud-functions/api/images 处理（Blob 优先，Supabase 兜底）
    // Sitemap.xml 生成器
    if(path === '/sitemap.xml' && method === 'GET') {
        const products = await sbGet('products', 'is_active=eq.true&order=created_at.desc');
        const lastmod = new Date().toISOString().split('T')[0];
        const resourcesBase = (env.RESOURCES_API_PROXY || 'https://resources.qiyuan.icu').replace(/\/$/, '');

        let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
        sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
        
        // 首页
        sitemap += '  <url>\n';
        sitemap += '    <loc>' + resourcesBase + '/</loc>\n';
        sitemap += '    <lastmod>' + lastmod + '</lastmod>\n';
        sitemap += '    <changefreq>daily</changefreq>\n';
        sitemap += '    <priority>1.0</priority>\n';
        sitemap += '  </url>\n';
        
        // 产品详情页
        if (Array.isArray(products)) {
            products.forEach(p => {
                const productLastmod = p.created_at ? p.created_at.split('T')[0] : lastmod;
                sitemap += '  <url>\n';
                sitemap += '    <loc>' + resourcesBase + '/product.html?id=' + p.id + '</loc>\n';
                sitemap += '    <lastmod>' + productLastmod + '</lastmod>\n';
                sitemap += '    <changefreq>weekly</changefreq>\n';
                sitemap += '    <priority>0.8</priority>\n';
                sitemap += '  </url>\n';
            });
        }
        
        sitemap += '</urlset>';
        
        const headers = {
            'Content-Type': 'application/xml',
            'Cache-Control': 'public, max-age=3600',
            ...getCorsHeaders(origin)
        };
        return new Response(sitemap, { status: 200, headers });
    }

    return err('Not found',404, origin);
  } catch(e) { 
    console.error('API Error:', e);
    return err('服务器内部错误: ' + (e.message || '未知错误'),500, origin); 
  }
}

// ============================================================================
// 临时邮箱（白嫖免费域名 + Cloudflare Email Routing + D1）
// 收信由 Cloudflare 收信 Worker（见 cloudflare/temp-mail-worker.js）写入 D1；
// 此处仅提供「生成地址 + 读信」API，走同源 /api/temp-mail/*，国内经 EdgeOne 稳。
// 环境变量：TEMP_MAIL_DOMAINS（可选，逗号分隔；缺省用默认三域名）/ TEMP_MAIL_DOMAIN（兼容单域名）/ CF_D1_API_TOKEN / TEMP_MAIL_D1_ID。临时邮箱与网盘均不再做人机验证。
// ============================================================================

// Cloudflare D1 REST 查询（参数化防注入）
async function d1Query(sql, params = []) {
  if (!CF_D1_API_TOKEN || !TEMP_MAIL_D1_ID) throw new Error('临时邮箱未配置（缺少 CF_D1_API_TOKEN / TEMP_MAIL_D1_ID）');
  const r = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database/${TEMP_MAIL_D1_ID}/query`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${CF_D1_API_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql, params }),
    }
  );
  const j = await r.json();
  if (!j.success) throw new Error('D1 查询失败: ' + JSON.stringify(j.errors || j));
  return (j.result && j.result[0] && j.result[0].results) || [];
}

function randomTempLabel(n = 10) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < n; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function jsonOk(data, origin, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...getCorsHeaders(origin) },
  });
}

// POST /temp-mail/address  → 生成随机地址（用户自选域名，无需人机验证），存入 D1
async function handleTempMailAddress(request, env, origin) {
  if (!TEMP_MAIL_DOMAINS.length) return err('临时邮箱域名未配置', 500, origin);
  let body = {};
  try { body = await request.json(); } catch (_) {}
  // 用户自选域名（临时邮箱不再做人机验证）；非法/缺省则回退首个允许域名
  const reqDomain = (body.domain || '').trim().toLowerCase();
  const chosen = TEMP_MAIL_DOMAINS.includes(reqDomain) ? reqDomain : TEMP_MAIL_DOMAINS[0];

  for (let attempt = 0; attempt < 5; attempt++) {
    const addr = `${randomTempLabel()}@${chosen}`;
    try {
      await d1Query('INSERT OR IGNORE INTO temp_addresses (addr, created_at) VALUES (?, ?)', [addr, Date.now()]);
      const rows = await d1Query('SELECT addr FROM temp_addresses WHERE addr = ?', [addr]);
      if (rows.length) return jsonOk({ addr }, origin, 200);
    } catch (e) {
      if (attempt === 4) throw e;
    }
  }
  throw new Error('生成地址失败，请重试');
}

// GET /temp-mail/messages?addr=  → 该地址邮件列表（不含正文）
async function handleTempMailMessages(request, env, url, origin) {
  const addr = (url.searchParams.get('addr') || '').toLowerCase().trim();
  if (!TEMP_MAIL_DOMAINS.some((d) => addr.endsWith(`@${d}`))) return err('非法地址', 400, origin);
  const rows = await d1Query(
    'SELECT id, from_addr, subject, received_at, raw_size FROM temp_messages WHERE addr = ? ORDER BY received_at DESC LIMIT 50',
    [addr]
  );
  return jsonOk({ messages: rows }, origin, 200);
}

// GET /temp-mail/message?id=&addr=  → 单封详情（含正文）
async function handleTempMailMessage(request, env, url, origin) {
  const id = url.searchParams.get('id') || '';
  const addr = (url.searchParams.get('addr') || '').toLowerCase().trim();
  if (!TEMP_MAIL_DOMAINS.some((d) => addr.endsWith(`@${d}`))) return err('非法地址', 400, origin);
  const rows = await d1Query('SELECT * FROM temp_messages WHERE id = ? AND addr = ?', [id, addr]);
  if (!rows.length) return err('邮件不存在或已过期', 404, origin);
  return jsonOk({ message: rows[0] }, origin, 200);
}
