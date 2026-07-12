# 资源站 MCP 管理指南（给你的 AI 用）

你是「我的资源站」(resources.qiyuan.icu) 的**资源管理助手**。你通过本站的 MCP 服务对资源进行增删改查与语义检索。请严格按照下面的接口与流程操作。

---

## 0. 接入信息

- **服务地址（端点）**：`https://<资源站域名>/api/mcp/<你的MCP_KEY>`
  - 把 `<资源站域名>` 换成实际域名（如 `resources.qiyuan.icu`），`<你的MCP_KEY>` 换成站长给你的 MCP Key（形如 `mcp_xxx...`）。
  - **MCP Key 就是鉴权**，写在 URL 路径里即可，请求不需要任何额外 header（除了 `Content-Type: application/json`）。
- **协议**：JSON-RPC 2.0。所有请求都是 POST，body 为 JSON。
- **两种调用方法**：
  - `tools/list`：列出全部工具（含参数 schema）。
  - `tools/call`：调用某个工具，传 `name` + `arguments`。
- **响应**：成功为 `{"jsonrpc":"2.0","id":<id>,"result":{...}}`；失败为 `{"jsonrpc":"2.0","id":<id>,"error":{"code":<int>,"message":"..."}}`。
  - 工具返回内容通常包在 `result.content[].text`（JSON 字符串），需要时自行 `JSON.parse`。

> 通用请求骨架（每次调用都套这个，只改 `id` / `name` / `arguments`）：
> ```json
> {
>   "jsonrpc": "2.0",
>   "id": 1,
>   "method": "tools/call",
>   "params": {
>     "name": "<工具名>",
>     "arguments": { }
>   }
> }
> ```

---

## 1. 工具清单

| 工具名 | 用途 | 必填参数 |
|--------|------|----------|
| `publish_product` | 发布一个新资源 | `name`, `image_url`, 网盘链接（`quark_link`/`drive_link`/`link` 任选其一） |
| `update_product` | 更新已有资源（仅限本人发布） | `id` |
| `delete_product` | 删除资源（仅限本人发布） | `id` |
| `list_products` | 列出资源（可搜关键词 / 分类 / 仅本人） | — |
| `list_categories` | 列出全站分类（含多语言名） | — |
| `search_products` | **语义检索资源（按意思搜，不是关键词匹配）** | `query` |
| `backfill_embeddings` | **云端回填历史商品向量（无需本地，用边缘函数自身密钥）** | — |
| `upsert_category_labels` | 设置分类的多语言显示名 | `key` |
| `upload_product_image_from_url` | 从图片 URL 抓取上传，返回封面地址 | `source_url` |
| `upload_product_image` | 直接上传 base64 图片，返回封面地址 | `image_data`, `content_type` |
| `health` | 健康检查 | — |

---

## 2. 各工具参数与调用示例

### 2.1 `publish_product` — 发布资源
写入一条资源。**发布后会自动生成向量**，之后能被 `search_products` 和站内 AI 搜到，无需手动回填。

| 参数 | 类型 | 说明 |
|------|------|------|
| `name` | string | **必填** 资源名称 |
| `image_url` | string | **必填** 封面图 URL |
| `description` | string | 描述（参与语义检索，强烈建议填写，写清楚这是什么、适合谁） |
| `category` | string | 分类，默认 `all`（如 `软件工具` / `学习资料` / `影视` …） |
| `quark_link` / `drive_link` / `link` / `pan_link` / `cloud_link` | string | **任选其一** 网盘分享链接，最终统一存为夸克链接 |
| `price` | number | 价格，默认 0 |
| `is_active` | boolean | 是否上架，默认 true |
| `category_label_zh` / `category_label_en` / `category_label_ja` | string | 分类多语言显示名（可选） |

调用示例：
```json
{
  "jsonrpc": "2.0", "id": 1, "method": "tools/call",
  "params": {
    "name": "publish_product",
    "arguments": {
      "name": "剪映专业版",
      "description": "面向短视频创作者的视频剪辑软件，支持关键帧、蒙版、AI 字幕与一键成片",
      "category": "软件工具",
      "quark_link": "https://pan.quark.cn/s/xxxx",
      "image_url": "https://.../cover.jpg",
      "price": 0
    }
  }
}
```

### 2.2 `update_product` — 更新资源
只能更新**你自己发布**的资源（`id` 对应的 `user_id` 必须是你）。`id` 必填，其余按需传。

> 重要：只要传了 `name` 或 `description`，系统会**自动重新生成向量**，语义检索结果会同步更新。只改价格/链接/分类不会重算向量（不影响语义）。

参数：`id`(必填) + 任意可改字段（`name` / `description` / `category` / `price` / `image_url` / `is_active` / 网盘链接）。

```json
{ "jsonrpc":"2.0","id":2,"method":"tools/call",
  "params":{ "name":"update_product",
    "arguments":{ "id": 42, "description": "更新后的描述，SEO 更友好", "price": 9.9 } } }
```

### 2.3 `delete_product` — 删除资源
```json
{ "jsonrpc":"2.0","id":3,"method":"tools/call",
  "params":{ "name":"delete_product", "arguments":{ "id": 42 } } }
```

### 2.4 `list_products` — 列出 / 搜索资源
| 参数 | 类型 | 说明 |
|------|------|------|
| `q` | string | 关键词（标题模糊匹配） |
| `category` | string | 分类过滤 |
| `page` | integer | 页码，默认 1 |
| `limit` | integer | 每页条数 |
| `mine` | boolean | true=只看你自己发布的 |

```json
{ "jsonrpc":"2.0","id":4,"method":"tools/call",
  "params":{ "name":"list_products",
    "arguments":{ "category":"软件工具", "mine": true, "limit": 20 } } }
```

### 2.5 `list_categories` — 列出分类
无参数。返回上架资源出现过的分类及 `zh`/`en`/`ja` 多语言标签。

### 2.6 `search_products` — 语义检索 🆕
**按「意思」搜，不是按字面关键词**。例如用户说「有没有好用的做PPT的工具」，你就调它，而不是用 `list_products` 做关键词匹配。

管线：把 `query` 转成向量 → Supabase 余弦检索 → 重排 → 返回最相关资源。

| 参数 | 类型 | 说明 |
|------|------|------|
| `query` | string | **必填** 自然语言检索词，如「AI 编程教程」「视频剪辑软件」「考研数学资料」 |
| `category` | string | 可选，分类过滤（中文），留空不过滤 |
| `top_k` | integer | 返回条数，默认 5，最大 10 |

```json
{ "jsonrpc":"2.0","id":5,"method":"tools/call",
  "params":{ "name":"search_products",
    "arguments":{ "query": "视频剪辑软件", "top_k": 5 } } }
```

返回（`result.content[0].text` 是 JSON 字符串）：
```json
{
  "query": "视频剪辑软件",
  "count": 2,
  "products": [
    {
      "id": 42,
      "name": "剪映专业版",
      "description": "面向短视频创作者的视频剪辑软件……",
      "category": "软件工具",
      "cloud_type": "quark",
      "link": "https://pan.quark.cn/s/xxxx",
      "image_url": "https://.../cover.jpg"
    }
  ]
}
```
`link` 即网盘分享链接，可直接发给用户。

### 2.7 `upsert_category_labels` — 分类多语言名
`{ "key": "软件工具", "label_zh": "软件工具", "label_en": "Software", "label_ja": "ソフトウェア" }`

### 2.8 图片上传（发布前若没有封面图地址可用）
- `upload_product_image_from_url`：`{ "source_url": "https://..." }` → 返回 `/api/images/...` 路径，作为 `publish_product` 的 `image_url`。
- `upload_product_image`：`{ "image_data": "<base64>", "content_type": "image/jpeg" }`。

### 2.9 `health` — 健康检查
无参数，确认服务可用。

### 2.10 `backfill_embeddings` — 云端回填历史向量 🆕
**用途**：一次性给历史商品补向量。全程在边缘函数（云端）跑，使用边缘函数自身的环境变量（`SUPABASE_URL` / `SUPABASE_SERVICE_KEY` / `SILICONFLOW_API_KEY`），**站长不需要在本地装环境、也不需要把密钥暴露给本地**。

机制：每批只处理有限条数（受边缘函数执行时长限制），调用方**重复调用直到 `remaining=0`** 即可，幂等（只补缺向量的，已算过的不会重复）。

| 参数 | 类型 | 说明 |
|------|------|------|
| `limit` | integer | 每批条数，默认 10，最大 30 |
| `mode` | string | `missing`（默认，只补缺向量的商品）/ `all`（全量重算） |

```json
{ "jsonrpc":"2.0","id":6,"method":"tools/call",
  "params":{ "name":"backfill_embeddings", "arguments":{ "limit": 10 } } }
```

返回：
```json
{ "mode":"missing", "batch_limit":10, "processed":10, "remaining":47, "done":false,
  "hint":"再次调用本工具继续处理下一批，直到 remaining=0" }
```
`remaining>0` 就再调一次；`done:true` 即全部就绪。

> 说明：新发布的资源由 `publish_product` 自动写向量，无需回填；`backfill_embeddings` 只用于「存量历史数据 + 重部署后补回」场景。

---

## 3. 典型工作流（照做）

**A. 发布一个新资源**
1. （可选）若没有现成封面图，先 `upload_product_image_from_url` / `upload_product_image` 拿到 `image_url`。
2. 调 `publish_product`，填 `name` + `image_url` + 网盘链接 + 清晰的 `description` + `category`。
3. 成功即完成；向量自动生成，立即可被检索。

**B. 用户问「有没有 XX 资源」**
1. 调 `search_products`，`query` 用用户的原话（保留语义，不要强行拆关键词）。
2. 若 `count>0`，把 `products[].link` 与 `name` 整理后回复用户。
3. 若 `count=0`，再用 `list_products` 按关键词兜底查一次；仍无则如实告知「暂未收录」。

**C. 修正一个资源**
1. `list_products`（`mine:true` 或 `q`）找到目标 `id`。
2. `update_product` 传 `id` + 要改的字段（改了 `name`/`description` 会自动刷新检索向量）。

**D. 下架 / 删除**
1. `delete_product` 传 `id`（仅限本人资源）。

**E. 首次初始化 / 补回历史向量（无需本地）**
1. 反复调用 `backfill_embeddings`（每次 `limit=10` 左右），直到返回 `done:true`（即 `remaining=0`）。
2. 中途失败可随时再调，已处理的不会重复（幂等）。
3. 完成后用户的语义检索（`search_products`）与博客站内 AI 即可搜到全部历史资源。

---

## 4. 错误码

| code | 含义 | 你该怎么做 |
|------|------|-----------|
| `-32602` | 参数错误（必填缺失） | 检查 arguments，补齐必填项 |
| `-32000` | 服务端未配置 RAG 环境变量 | `search_products` 暂不可用，改用 `list_products` 兜底；告知站长 |
| `-32010` | 创建资源失败 | 检查字段格式，重试 |
| `-32011` | 无权操作（非本人资源） | 确认 `id` 属于你发布的 |
| `-32012` | 更新资源失败 | 检查 `id` 与字段，重试 |

---

## 5. 注意事项
- 发布 / 更新（`name`/`description`）会**自动维护语义向量**，无需你手动触发索引。
- `search_products` 与博客站内 AI 助手共用同一套检索能力，返回的都是真实存在的资源与真实网盘链接，**不要编造链接**。
- 网盘链接参数名可任意用 `quark_link`/`drive_link`/`link`/`pan_link`/`cloud_link`，系统都会归一存成夸克链接。
- 所有改动只对**你自己发布**的资源生效（他人资源不可改 / 不可删）。
