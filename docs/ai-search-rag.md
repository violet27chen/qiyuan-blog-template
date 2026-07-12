# 祈愿博客 · 站内 AI 助手（RAG 管线）

> 本文档说明「祈愿博客」站内 AI 助手的检索增强生成（RAG）架构与部署方式。
> 技术栈为**自托管 RAG**：硅基流动 `BAAI/bge-m3`（向量模型）+ 双向量库（博客文章在 Neon `pgvector`，资源站在 Supabase `pgvector`）+ DeepSeek `deepseek-ai/DeepSeek-V4-Flash`（生成模型，经硅基流动 OpenAI 兼容端点，复用 `SILICONFLOW_API_KEY`，无需独立 Key），与 Cloudflare 无关。
> 资源站（示例域名 resources.qiyuan.icu）的 `products` 表就在 Supabase，博客边缘函数本就作为该资源站的 MCP 服务端，因此直接复用同一套 Supabase 连接。

## 为什么从第三方托管搜索迁到自托管 RAG

之前用第三方托管搜索（Cloudflare AI Search）时踩过两个坑：爬整页 HTML 噪声大、且出现过「AI 编造不存在的文章/TikTok 链接」。
自托管 RAG 把数据源换成**构建时生成的结构化 JSON**，并显式控制「嵌入 → 检索 → 生成」每一步，从根上保证：

1. 检索语料干净：博客文章直接读 Markdown 源（`scripts/lib/corpus.mjs`），不含导航/页脚噪声；资源站用 Supabase 中已清洗过的 `products` 记录。
2. 引用的 URL 100% 真实：向量库里只存构建产物里的 `url` / `alternates`（文章）与 `products` 里的真实网盘链接（资源）。
3. 生成受约束：系统提示词要求「只引用检索资料中的真实链接，禁止编造」（见 `config/chat-system-prompt.md`）。

## 架构

```
构建时 (astro build，astro:build:done)
  └─ 博客文章 → integrations/index-rag-neon.mjs（indexRagNeon 集成）
       src/content/blog/*.md → buildDocuments()
         ├─ 调 SiliconFlow BAAI/bge-m3 生成 1024 维向量
         └─ upsert → Neon rag_posts 表 (pgvector)
  （缺 SILICONFLOW_API_KEY / NEON_SERVERLESS_URL 则跳过文章索引，不阻断构建）

资源站资源向量（与博客不同源，存 Supabase products）：
  ├─ 自动：边缘函数 publish_product / update_product 写库后，调 bge-m3 生成向量写入 products.embedding
  └─ 历史回填（二选一）：
       A. 云端（推荐，无需本地）：调 MCP 工具 backfill_embeddings（边缘函数用自身环境变量跑，循环调用至 remaining=0）
       B. 本地（备选）：npm run index:resources → scripts/backfill-resources-embeddings.mjs
          （读 Supabase 中「缺向量」的上架商品，批量生成向量写回；REEMBED=1 可全量重嵌）

手动补跑（可选，本地方式）
  npm run index:neon        →  scripts/index-posts-neon.mjs                （博客文章 → Neon）
  npm run index:resources   →  scripts/backfill-resources-embeddings.mjs   （资源历史补齐 → Supabase）
  # 注意：若不想在本地暴露密钥，直接用 MCP backfill_embeddings 工具（云端执行）即可

运行时（每次对话）  /api/chat-api/chat/completions  →  edge-functions/api/[[default]].js（/api/* 路由下的 /chat-api/* 分支）
    ├─ 1) 硅基流动 BAAI/bge-m3：把用户问题转成向量
    ├─ 2) 跨源检索：Neon 检索 rag_posts（取 top-15）+ Supabase match_products RPC 检索 products（取 top-15）
    ├─ 2.5) 硅基流动 bge-reranker-v2-m3：对两类候选分别重排，各取 top-K（文章 5 / 资源 4）
    ├─ 3) 组装上下文（博客文章完整正文 + 资源名称/分类/链接/描述）+ 系统提示词
    └─ 4) DeepSeek deepseek-ai/DeepSeek-V4-Flash：流式生成，SSE 透传回浏览器
```

## 前置准备

### 1. 建表（只需一次）

- **博客文章（Neon）**：在 Neon 控制台 SQL 编辑器运行 `database/rag_posts.sql`：启用 `vector` 扩展、建 `rag_posts` 表（含 `embedding vector(1024)`）、加 HNSW 余弦索引。
- **资源站资源（Supabase）**：在 Supabase SQL 编辑器运行 `database/products_embedding.sql`：给 `products` 表加 `embedding vector(1024)` 列、HNSW 余弦索引、以及 `match_products(query_embedding text, match_threshold float, match_count int)` 语义检索 RPC（仅返回 `is_active` 且有向量的商品，`link` 取 `coalesce(quark_link, drive_link, link)`）。两个脚本均**幂等**，可重复运行。

> 表名说明：博客用 `rag_posts`（而非 `posts`）是为避开可能已存在的同名表；资源站直接复用资源站既有的 `products` 表（加 `embedding` 列），不新建表，避免数据孤岛。

### 2. 配置 EdgeOne 环境变量

在 EdgeOne Pages 项目设置里注入以下环境变量（**不要写进仓库**）：

| 变量名 | 说明 |
|--------|------|
| `SILICONFLOW_API_KEY` | 硅基流动 API Key（同时用于嵌入、重排、生成——DeepSeek 经硅基流动端点调用，复用此 Key） |
| `NEON_SERVERLESS_URL` | Neon 连接串 `postgresql://user:pass@host/db`（博客文章向量库） |
| `SUPABASE_URL` | Supabase 项目地址，如 `https://xxxx.supabase.co`（资源站 Products 向量库，边缘函数本就连它） |
| `SUPABASE_SERVICE_KEY` | Supabase service_role key（资源站读写，边缘函数本就使用） |

代码位置：`edge-functions/api/[[default]].js` 的 `handleChatRag()`、`retrieveResources()`、`embedProductForRag()`。

### 3. 索引文章到向量库

索引分两种触发方式，底层逻辑共用 `scripts/lib/rag-index.mjs`：

**① 构建时自动（推荐，已默认开启）**
`astro.config.mjs` 已注册 `indexRagNeon()` 集成。每次 `astro build` 的 `astro:build:done` 阶段会自动读取全部博客文章（`buildDocuments()`），批量调硅基流动生成向量并 upsert 进 Neon `rag_posts` 表。
前置条件：构建环境需注入 `SILICONFLOW_API_KEY` 和 `NEON_SERVERLESS_URL`；**若缺失则自动跳过并打印警告**，不会中断构建。

**② 手动补跑（排查 / 重索引用）**

```bash
export SILICONFLOW_API_KEY=sk-xxx
export NEON_SERVERLESS_URL=postgresql://user:pass@ep-xxx.neon.tech/db
npm run index:neon
```

两种方式主键 `id` 冲突时均自动 `ON CONFLICT (id) DO UPDATE`，重跑即覆盖，无需清表。

### 资源站资源向量（存 Supabase products）

资源向量**不需要**从资源站重新同步博客侧——`products` 表就在 Supabase，博客边缘函数直接读写。

**① 自动嵌入（已默认开启）**：边缘函数在 `publish_product` / `update_product` 成功写库后，自动用 bge-m3 生成向量并 `sbPatch` 回 `products.embedding`。缺 `SILICONFLOW_API_KEY` 时优雅跳过，**不影响发布**。

**② 历史商品补齐（一次性）**：

```bash
export SUPABASE_URL=https://xxxx.supabase.co
export SUPABASE_SERVICE_KEY=eyJ...            # service_role key
export SILICONFLOW_API_KEY=sk-xxx
npm run index:resources                        # = scripts/backfill-resources-embeddings.mjs
# 可选：
#   REEMBED=1 npm run index:resources          # 忽略是否已有向量，全量重嵌（改了嵌入模型/字段时用）
#   DRY=1 npm run index:resources              # 只打印待处理数量，不写回
```

- 脚本默认只处理「缺向量（`embedding is null`）的上架商品」，分批（每批 20）调硅基流动生成向量后写回；带基础限速避免 429。
- 文本来源为「名称 + 描述」（截断 8000 字以内，与边缘函数自动嵌入一致）。
- 写回失败/嵌入失败会跳过该条并打印，不中断整体回填。

### 4. 部署

正常 `astro build &&` 部署到 EdgeOne。边缘函数 `handleChatRag` 在 `/api/chat-api/*` 路由生效
（边缘函数整体挂在 `/api/*` 下，`onRequest` 去掉 `/api` 前缀后再匹配 `/chat-api` 分支）。
前端 `ChatBot.tsx` 调用同源 `/api/chat-api/chat/completions`，无需任何第三方托管搜索。
dev 下 `astro.config.mjs` 的 `/api/chat-api` 代理会直接转发到已部署的边缘函数。

## 模型参数

| 环节 | 模型 / 服务 | 关键参数 |
|------|------------|----------|
| 嵌入 | 硅基流动 `BAAI/bge-m3` | 1024 维，`encoding_format: float`（文章与资源共用） |
| 向量库（文章） | Neon `pgvector` | `vector(1024)`，`<=>` 余弦距离，HNSW 索引（表 `rag_posts`） |
| 向量库（资源） | Supabase `pgvector` | `vector(1024)`，`<=>` 余弦距离，HNSW 索引（表 `products`，经 `match_products` RPC） |
| 检索（跨源） | SQL / RPC（跨源） | 同一查询向量分别检索：Neon `rag_posts`（`ORDER BY embedding <=> $1 LIMIT 15`）与 Supabase `match_products`（top-15）；各取 top-15 候选 |
| 重排 | 硅基流动 `BAAI/bge-reranker-v2-m3` | `POST /v1/rerank`，对两类候选**分别**精排：文章取 top-5、资源取 top-4；任一类失败回退其向量排序，不影响另一类 |
| 生成 | DeepSeek `deepseek-ai/DeepSeek-V4-Flash`（经硅基流动端点） | `stream: true`，`temperature: 0.3`；大模型上下文充裕，**检索正文不再截断（喂完整正文）**，彻底避免长文尾部信息缺失 |

配置集中在 `config/site.yaml` 的 `rag:` 块（供查阅，代码实际读环境变量）。

## 系统提示词

`config/chat-system-prompt.md` 同时供两种用途：
- 作为 `handleChatRag` 内 `RAG_SYSTEM_PROMPT` 常量的来源（边缘函数里有一份对齐副本）；
- 人工排查/调优时阅读。

核心要求：只依据检索资料、只引用真实 `url` / `alternates`（文章）或网盘链接（资源）、禁止编造、按用户语言优先引用对应 `alternates` 链接。

## MCP 语义检索工具（资源库 RAG 对外接口）

博客边缘函数本身也是资源站（示例域名 resources.qiyuan.icu）的 MCP 服务器（`/api/mcp/<key>`）。除原有的 `publish_product` / `list_products` 等工具外，新增了基于向量库的语义检索工具，让任意接入该 MCP 的客户端也能「语义搜资源」：

- 工具名：`search_products`
- 入参：`query`（必填，自然语言检索词）、`category`（可选，中文分类过滤）、`top_k`（可选，默认 5，最大 10）
- 内部流程：硅基流动 bge-m3 把 `query` 转向量 → Supabase `match_products` RPC 余弦检索 top-15 → bge-reranker 精排 → 取 `top_k` 条
- 返回：每条资源的 `id / name / description / category / cloud_type / link（网盘分享链接，coalesce 自 quark_link/drive_link/link）/ image_url`

示例（MCP `tools/call`）：

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "search_products",
    "arguments": { "query": "AI 编程教程", "top_k": 3 }
  }
}
```

> 该工具依赖 `SILICONFLOW_API_KEY`（与站内问答同源）；Supabase 连接由 `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` 提供（MCP 服务端本就必需）。任一缺失时返回 `-32000` 错误，不影响其它 MCP 工具。

## 排查备忘

- 边缘函数返回 503「未配置环境变量」：EdgeOne 环境变量没注入或名字拼错（注意大小写）。
- **只回复博客、搜不到资源**：多半是 Supabase `products` 表没跑过 `products_embedding.sql`（缺 `embedding` 列或 `match_products` RPC），或历史商品没跑过 `backfill_embeddings`（云端 MCP 工具）或 `npm run index:resources` 回填向量。边缘函数对资源检索做了优雅降级——资源表缺失/报错时**只返回博客文章**并打日志，不会报错。
- 检索为空但索引成功：检查 `NEON_SERVERLESS_URL` 指向的库是否就是建表那个（`rag_posts` 是否有数据）；资源侧检查 Supabase 项目与 `match_products` 是否返回数据。
- 生成报 401/429：硅基流动 Key（生成与嵌入共用同一 Key）失效或超限；嵌入报 401 同因。
- 向量维度报错：确认 `rag_posts.sql` / `products_embedding.sql` 里 `vector(1024)` 与 bge-m3 输出一致（bge-m3 固定 1024 维）。

## 备注

- 以往曾生成 per-post JSON（`dist/api/posts/*.json`）+ 专用站点地图 `sitemap-api-posts.xml` 供第三方搜索爬取，
  自改为自托管 RAG 后这些产物已不再需要，已从构建流程移除（构建时只跑 `indexRagNeon` 索引到 Neon），以加快构建。
- AI 检索数据源分两类：**`rag_posts`（Neon，博客文章）+ `products`（Supabase，资源站资源）**，在边缘函数内分别检索、各自重排后合并上下文，与任何静态 JSON 无关。
- 资源向量更新机制：新建/更新商品由边缘函数自动嵌入；历史商品与「改了嵌入字段后全量重嵌」用 MCP 工具 `backfill_embeddings`（云端，推荐）或 `npm run index:resources`（`REEMBED=1`，本地）。删除商品不会残留孤儿向量（行随表删）。
