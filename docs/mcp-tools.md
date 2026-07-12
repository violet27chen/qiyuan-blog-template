# 资源站 MCP 工具接口文档

资源站（`resources.qiyuan.icu`，由博客边缘函数托管）对外暴露一套 **JSON-RPC 2.0** 的 MCP 服务，任何支持 MCP 的客户端（Claude Desktop、Cursor、自建 Agent 等）配置一个 MCP Key 即可调用下面全部工具。

---

## 1. 接入方式

- **协议**：JSON-RPC 2.0（`application/json`）
- **端点**：`https://<你的域名>/api/mcp/<YOUR_MCP_KEY>`
  - MCP Key 通过「站长后台 / 个人中心」生成；也可调 `POST /api/mcp/key`（用户名+密码）获取，返回 `mcp_key` 与 `mcp_url`。
- **两步调用**：
  1. `tools/list` —— 列出全部可用工具及其 `inputSchema`。
  2. `tools/call` —— 按工具名 + `arguments` 调用。

### 列出工具

```bash
curl -s https://<你的域名>/api/mcp/<YOUR_MCP_KEY> \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

### 调用工具（通用模板）

```bash
curl -s https://<你的域名>/api/mcp/<YOUR_MCP_KEY> \
  -H 'Content-Type: application/json' \
  -d '{
    "jsonrpc":"2.0",
    "id":2,
    "method":"tools/call",
    "params":{
      "name":"<工具名>",
      "arguments":{ ... }
    }
  }'
```

> 所有响应都是 `{"jsonrpc":"2.0","id":<id>,"result":{...}}` 或 `{"jsonrpc":"2.0","id":<id>,"error":{"code":<int>,"message":"..."}}`。

---

## 2. 工具清单

| 工具 | 作用 | 必填参数 |
|------|------|----------|
| `publish_product` | 发布资源到资源站 | `name`, `image_url`（链接类 `drive_link`/`quark_link`/`link` 三选一） |
| `update_product` | 更新自己发布的商品 | `id` |
| `delete_product` | 删除自己发布的商品 | `id` |
| `list_products` | 列出商品（公开 / 仅本人） | — |
| `list_categories` | 列出分类（含多语言标签） | — |
| `search_products` | **混合检索资源（向量 + 词法 RRF）** | `query` |
| `backfill_embeddings` | **云端回填历史商品向量（无需本地）** 🆕 | `limit`, `mode` |
| `upsert_category_labels` | 写入/更新分类多语言显示名 | `key` |
| `upload_product_image_from_url` | 从图片 URL 抓取并上传 | `source_url` |
| `upload_product_image` | 直接上传图片（base64） | `image_data`, `content_type` |
| `health` | 健康检查 | — |

---

## 3. 各工具参数与示例

### 3.1 `publish_product` — 发布资源

写入 `products` 表。**发布后会自动生成向量**（供 `search_products` / 站内 RAG 检索），无需手动回填。

参数：

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | string | **必填** 资源名称 |
| `image_url` | string | **必填** 封面图 |
| `description` | string | 描述（参与向量嵌入，建议填写） |
| `category` | string | 分类，默认 `all` |
| `category_label_zh` / `category_label_en` / `category_label_ja` | string | 分类多语言显示名 |
| `drive_link` / `link` / `quark_link` / `pan_link` / `cloud_link` | string | **任选其一** 网盘链接（最终归一写入 `quark_link` 列） |
| `price` | number | 价格，默认 0 |
| `thumb_url` | string | 缩略图 |
| `is_active` | boolean | 是否上架，默认 true |

```json
{
  "jsonrpc":"2.0","id":2,"method":"tools/call",
  "params":{
    "name":"publish_product",
    "arguments":{
      "name":"剪映专业版",
      "description":"一款面向短视频创作者的视频剪辑软件，支持关键帧、蒙版、AI 字幕",
      "category":"软件工具",
      "quark_link":"https://pan.quark.cn/s/xxxx",
      "image_url":"https://.../cover.jpg",
      "price":0
    }
  }
}
```

### 3.2 `update_product` — 更新商品

仅能更新**自己发布**的商品（`user_id` 校验）。`id` 必填，其余按需传。

> 注意：当传入 `name` 或 `description` 时，会自动**重新生成向量**，保证语义检索结果同步更新。

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | integer | **必填** 商品 id |
| `name` / `description` / `category` / `price` / `image_url` / `thumb_url` / `is_active` | 同上 | 按需 |
| `drive_link` / `link` / `quark_link` / `pan_link` / `cloud_link` | string | 更新网盘链接（非空） |

### 3.3 `delete_product` — 删除商品

```json
{ "name":"delete_product", "arguments":{ "id": 42 } }
```

### 3.4 `list_products` — 列出商品

| 字段 | 类型 | 说明 |
|------|------|------|
| `q` | string | 关键词（标题模糊匹配） |
| `category` | string | 分类过滤 |
| `page` | integer | 页码，默认 1 |
| `limit` | integer | 每页条数 |
| `mine` | boolean | true=仅本人发布的 |

### 3.5 `list_categories` — 列出分类

无参数。返回上架商品中出现过的分类（含 `zh`/`en`/`ja` 多语言标签）。

### 3.6 `search_products` — 混合检索资源（向量 + 词法）

**RAG 检索工具（已升级为混合检索）**：用硅基流动 `BAAI/bge-m3` 把 `query` 转成向量 → 查 Supabase `match_products` RPC（pgvector 余弦检索）**同时**走一路词法召回（Supabase REST `ilike`，覆盖软件名 / 型号 / 提取码等精确词）→ 两路经 **RRF 倒数排名融合** → `bge-reranker-v2-m3` 精排 → 返回最相关资源。混合检索对「搜具体名字」更稳，且能召回尚未嵌入向量的历史资源。

**前置条件**：边缘函数环境变量需注入 `SILICONFLOW_API_KEY`（嵌入 + 重排共用）。缺该变量时返回 MCP 错误 `-32000`。

参数：

| 字段 | 类型 | 说明 |
|------|------|------|
| `query` | string | **必填** 自然语言检索词，如「AI 编程教程」「视频剪辑软件」 |
| `category` | string | 可选，分类过滤（中文，如 `软件工具` / `学习资料`），留空不过滤 |
| `top_k` | integer | 返回条数，默认 5，最大 10 |

请求示例：

```bash
curl -s https://<你的域名>/api/mcp/<YOUR_MCP_KEY> \
  -H 'Content-Type: application/json' \
  -d '{
    "jsonrpc":"2.0","id":3,"method":"tools/call",
    "params":{
      "name":"search_products",
      "arguments":{ "query":"视频剪辑软件", "top_k": 5 }
    }
  }'
```

返回结构（`result.content[0].text` 为 JSON 字符串）：

```json
{
  "query": "视频剪辑软件",
  "count": 2,
  "products": [
    {
      "id": 42,
      "name": "剪映专业版",
      "description": "一款面向短视频创作者的视频剪辑软件……",
      "category": "软件工具",
      "cloud_type": "quark",
      "link": "https://pan.quark.cn/s/xxxx",
      "image_url": "https://.../cover.jpg"
    }
  ]
}
```

> `link` 即资源的网盘分享链接（来自 `products.quark_link` 列）。

### 3.7 `backfill_embeddings` — 云端回填历史向量 🆕

**无需本地**：全程在边缘函数（云端）执行，直接使用边缘函数自身的环境变量 `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` / `SILICONFLOW_API_KEY`，站长不必在本地装 Node、也不必把密钥暴露给本地终端。

机制：受边缘函数执行时长限制，每批只处理有限条数；**调用方循环调用直到返回 `remaining=0`** 即可。幂等——只补缺向量的商品（默认 `mode=missing`），已算过的不重复。

参数：

| 字段 | 类型 | 说明 |
|------|------|------|
| `limit` | integer | 每批条数，默认 10，最大 30 |
| `mode` | string | `missing`（默认，只补缺向量）/ `all`（全量重算，忽略是否已存在向量） |

```bash
curl -s https://<你的域名>/api/mcp/<YOUR_MCP_KEY> \
  -H 'Content-Type: application/json' \
  -d '{
    "jsonrpc":"2.0","id":4,"method":"tools/call",
    "params":{ "name":"backfill_embeddings", "arguments":{ "limit": 10 } }
  }'
```

返回：

```json
{ "mode":"missing", "batch_limit":10, "processed":10, "remaining":47, "done":false,
  "hint":"再次调用本工具继续处理下一批，直到 remaining=0" }
```

> 新发布资源由 `publish_product` 自动写向量，本工具只用于「存量历史数据 + 重部署后补回」。中途失败可随时再调，已处理的不会重复。

### 3.8 `upsert_category_labels` — 分类多语言名

| 字段 | 类型 | 说明 |
|------|------|------|
| `key` | string | **必填** 分类键（与 `products.category` 一致，中文） |
| `label_zh` / `label_en` / `label_ja` | string | 对应语言显示名 |

### 3.8 `upload_product_image_from_url` / `upload_product_image`

上传商品封面图，返回 `/api/images/...` 路径，供 `publish_product` 的 `image_url` 使用。

- `upload_product_image_from_url`：`{ "source_url": "https://..." }`
- `upload_product_image`：`{ "image_data": "<base64>", "content_type": "image/jpeg" }`

### 3.9 `health` — 健康检查

无参数，返回服务状态。

---

## 4. 错误码

| code | 含义 |
|------|------|
| `-32602` | 参数错误（如必填缺失） |
| `-32000` | 服务端未配置 RAG 环境变量（`SILICONFLOW_API_KEY`） |
| `-32010` | 创建商品失败 |
| `-32011` | 无权操作（非本人资源） |
| `-32012` | 更新商品失败 |

---

## 5. 与站内 RAG 的关系

`search_products` 与博客站内助手的「资源检索」走的是**同一条管线**（`embedQuery → 向量召回 match_products + 词法 ilike 双路 → RRF 融合 → bge-reranker 精排`）：

- 博客聊天：用户问资源相关问题 → 边缘函数 `handleChatRag` 一并检索 `rag_posts`（文章）+ `products`（资源）→ 合并上下文交给 DeepSeek 生成回答。
- MCP `search_products`：把「资源检索」这一能力直接对外部客户端开放，返回结构化商品列表（适合做资源导航 / 工作流触发）。

两者都依赖 `products.embedding` 向量列（由 `database/products_embedding.sql` 建表、`npm run index:resources` 回填历史数据、发布/更新时自动维护）。
