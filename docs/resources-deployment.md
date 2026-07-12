# 博客侧资源引用配置

> ⚠️ **资源站是独立部署的项目**（源码在 [`../resource-site/`](../resource-site/)），本文档只说明**博客如何引用**已部署好的资源站数据。资源站本身的建库与部署请见 [`resource-site/docs/DEPLOYMENT.md`](../resource-site/docs/DEPLOYMENT.md)。

## 相关目录

| 路径 | 说明 |
| --- | --- |
| `resource-site/` | **资源站独立项目**（边缘函数 + 数据库 Schema + 文档），需单独部署 |
| `resource-site/database/schema.sql` | 资源站 Supabase 表结构（建库时执行） |
| `resource-site/database/rls_policies.sql` | 资源站 RLS 安全策略 |
| `database/products_embedding.sql` | 博客侧：为 `products` 加向量列，供 RAG 语义搜索 |
| `database/resource_category_i18n.sql` | 博客侧：资源分类多语言表 |
| `edge-functions/api/[[default]].js` | 博客边缘函数，`/api/*` 可代理 / 读取资源站数据 |
| `cloud-functions/api/images/` | Node 函数：资源图片读写（Supabase Storage，Blob 可选） |

## EdgeOne 环境变量

在 EdgeOne 控制台 → 边缘函数 → 环境变量 中配置（与资源站相同）：

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
JWT_SECRET=***
PUBLISH_KEY=mcp_...
PUBLIC_BASE_URL=https://www.qiyuan.icu
```

说明：
- `PUBLISH_KEY`：同时用于 `/api/publish` 发布与 `/api/images/upload` 上传（填有效 MCP Key）
- **图片存储**：默认使用 Supabase Storage（`product-images` 桶），与资源站共用
- `GET /api/images/*` 与上传均走 Supabase；Blob 相关代码保留为可选扩展，无需配置
- AI 发布提示词：[ai-resources-publisher-prompt.md](./ai-resources-publisher-prompt.md)

## 跨域（CORS）

已在 `edge-functions/api/[[default]].js` 中配置为博客域名：

- `https://www.qiyuan.icu`
- `https://qiyuan.icu`

本地开发 `localhost` 仍自动放行。

## 本地开发

`npm run dev` 时，Astro 会将 `/api` 代理到 `https://resources.qiyuan.icu`（示例资源站域名，可通过环境变量 `RESOURCES_API_PROXY` 覆盖）。

博客上线且 EdgeOne 部署了边缘函数后，生产环境直接访问同源 `/api`，无需代理。

## 故障排查

### `/api/*` 返回 500

常见原因：

1. **环境变量未配置** — EdgeOne 控制台需设置 `SUPABASE_URL`、`SUPABASE_SERVICE_KEY`、`JWT_SECRET`（与资源站相同值即可）
2. **URL 解析失败** — 已在边缘函数中使用 `parseRequestUrl()` 兼容 EdgeOne 的请求格式；重新部署 `edge-functions/` 后生效

部署后可用 curl 验证：

```bash
curl https://www.qiyuan.icu/api/categories
curl "https://www.qiyuan.icu/api/products?limit=2"
```

## 与资源站的数据关系

博客 `/resources` 与资源站（示例域名 resources.qiyuan.icu）**共用同一套 Supabase 数据库**。在资源站后台新增/修改资源后，博客资源页会自动显示最新数据（无需手动同步）。

## 分类多语言

- 分类键：`products.category`（中文，如 `AI工具`）
- 翻译表：`resource_category_i18n`（`database/resource_category_i18n.sql`）
- API：`GET /api/categories` 返回 `[{ key, zh, en, ja }, ...]`
- 更新翻译：Supabase 控制台、MCP `upsert_category_labels`，或发布时带 `category_label_en` / `category_label_ja`
- 未配置翻译时，各语言暂时显示中文键

## 可选：同步静态备份

```bash
npm run sync:resources
```

将当前 API 数据导出到 `config/resources.yaml`（仅作备份，页面默认走实时 API）。
