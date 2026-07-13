[中文](./README.md) | [English](./README.en.md) | [日本語](./README.ja.md)

# qiyuan-blog-template

> 🚀 **带 AI 问答的 Astro 全功能博客模板** — 内置 RAG 站内问答、文章朗读、评论、网盘、短链与资源站，EdgeOne Makers 部署，开箱即用。

[![Demo](https://img.shields.io/badge/Demo-在线体验-blue?style=flat-square)](https://www.qiyuan.icu)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

基于 [Astro](https://astro.build) 深度定制的个人博客与技术资源站模板（衍生自 [Koharu](https://github.com/koharu-org/koharu) 主题），在线示例：[https://www.qiyuan.icu](https://www.qiyuan.icu)。

## 功能页面截图

![祈愿博客首页截图](https://cdn.jsdelivr.net/gh/violet27chen/qiyuan-blog-template@main/screenshots/home.jpg)

> 上图为**示例站（qiyuan.icu，已开启全部可选功能）**首页：顶部 Hero 视频区、作者卡片、文章列表、站内 AI 助手浮窗、导航栏的资源/网盘/短链入口等。模板默认关闭这些可选功能，克隆后按需开启。

| 歌单                              | 临时邮箱                               |
| ------------------------------- | ---------------------------------- |
| ![歌单页面](https://cdn.jsdelivr.net/gh/violet27chen/qiyuan-blog-template@main/screenshots/music.png) | ![临时邮箱](https://cdn.jsdelivr.net/gh/violet27chen/qiyuan-blog-template@main/screenshots/tempmail.png) |

| 网盘                              | 资源站                                |
| ------------------------------- | ---------------------------------- |
| ![网盘](https://cdn.jsdelivr.net/gh/violet27chen/qiyuan-blog-template@main/screenshots/netdisk.png) | ![资源站](https://cdn.jsdelivr.net/gh/violet27chen/qiyuan-blog-template@main/screenshots/resources.jpg) |

> 本仓库 **`qiyuan-blog-template`** 是一个**博客模板**：在 GitHub 仓库页面点击 **Use this template** 即可一键创建你自己的博客仓库，再按需修改 `config/site.yaml`、填充文章、配置环境变量后部署。部署优先推荐国内友好的 **EdgeOne Makers**，详见下方「作为模板使用」（资源站为独立子项目，需单独部署，见「资源站搭建教程」）。

## 永久免费说明

**本模板的全部功能（含评论、站内 AI 助手、资源站、临时邮箱、文章朗读、短链、网盘）在对应服务商的免费额度内均可永久免费使用，不强制任何付费。** 下表列出每个功能所依赖的外部服务及其当前免费额度（数据核实于 2026-07，以各厂商官网为准）：

| 功能 | 依赖服务 | 免费额度（当期） |
| --- | --- | --- |
| 站点托管 + 全部 API（RAG / 临时邮箱 / 评论 / 上传 / MCP / 统计） | EdgeOne Makers | 边缘函数 300 万次/月、云函数 100 万次/月、KV / Blob 各 1 GB、构建 500 次/月、自定义域名 200 个、免费 SSL；网站加速流量/请求在限免阶段不限量（免费版不含视频/大文件分发加速，本站视频与网盘文件经 R2 直传，不消耗该加速额度） |
| 站内 AI 助手 · 博客文章向量库 | Neon（Postgres + pgvector） | 永久免费：0.5 GB 存储/项目、100 CU-小时/月、100 个项目、5 GB 出站/月（空闲自动缩容） |
| 站内 AI 助手 · 资源站向量库 | Supabase | 永久免费：500 MB 数据库、1 GB 文件存储、5 GB 带宽/月、5 万 MAU、API 请求不限量（空闲 7 天暂停） |
| 站内 AI 助手 · 嵌入 / 重排 | 硅基流动 bge-m3 / bge-reranker | 永久免费、中国大陆直连、1000 RPM |
| 站内 AI 助手 · 生成模型 | 智谱 GLM-4.7-Flash（首选兜底） | 永久免费（200K 上下文）；ModelScope Llama-3.3-70B 每日 2000 次免费；商汤 deepseek-v4-flash 公测免费（每 5 小时数百次调用） |
| 评论存储 | Cloudflare KV | 10 万读/天、1000 写/天、1000 删/天、1 GB 存储 |
| 评论图 / 文章朗读音频 / 网盘对象 | Cloudflare R2 | 10 GB 存储/月、100 万 Class A 操作、1000 万 Class B 操作/月、出站流量免费 |
| 评论图 / 网盘上传 Worker | Cloudflare Workers | 10 万请求/天 |
| 临时邮箱（收信 / 存储 / 验证） | Cloudflare D1 + Email Routing + Turnstile | D1 5 GB 存储 / 500 万行读/天；Email Routing 免费；Turnstile 免费无限 |
| 短链存储 | Cloudflare KV | 与评论共用同一命名空间额度（键前缀 `short:`） |

> **说明**：
> - **永久免费档**（长期有效）：Neon、Supabase、Cloudflare（Workers/KV/R2/D1/Email Routing/Turnstile）、硅基流动嵌入/重排、智谱 GLM-4.7-Flash。
> - **当前限时免费 / 公测**：EdgeOne Makers 加速流量处于限免阶段；商汤 sensenova（deepseek-v4-flash）为免费公测，额度与政策可能随公测结束调整——但模板已内置**多生成平台兜底**（智谱 GLM-4.7-Flash 永久免费、ModelScope 每日 2000 次免费），任一平台变动都不会让 AI 助手失效。
> - **文章朗读音频在本地预生成**（Edge TTS，走微软免费语音端点，无需密钥、无费用），生成后仅占用 Cloudflare R2 的存储额度。
> - 只要使用量不超出上表各档额度，整套博客（含全部可选功能）即可**零成本永久运行**；仅在超出免费额度后才需按量付费（如 Supabase 扩容、Cloudflare 超出请求数、Neon 升级计算等）。

## 🚀 作为模板使用

1. 进入本仓库 **`qiyuan-blog-template`** 页面，点击 **Use this template → Create a new repository**，填写你的新仓库名（可任意命名）。
2. `git clone` 到本地，`npm install`。
3. 复制 `.env.example` 为 `.env`，按需填写各功能的环境变量（不填则对应功能自动关闭）。
4. 编辑 `config/site.yaml`：改 `site.title` / `url` / `avatar` / `social` 为你自己的信息。
5. 删除 `src/content/blog/welcome.md`，放入你自己的 `.md` 文章。
6. 部署到 EdgeOne Makers（或其它 Astro 兼容平台），在平台的环境变量中配置与 `.env` 相同的键值。

## 可选功能默认关闭

为保持模板开箱即用的纯净度，**以下可选功能默认全部关闭**，克隆后按需开启：

| 功能 | 配置文件开关 | 默认值 | 开启方式 |
| --- | --- | --- | --- |
| 评论 | `comment.provider` | `none`（关闭） | 改为 `giscus` / `waline` / `twikoo` / `custom` 并填对应配置 |
| 站内 AI 助手（RAG） | `rag.enabled` | `false` | 设为 `true`，并配置 `SILICONFLOW_API_KEY` / `NEON_SERVERLESS_URL` 等 |
| 资源站 | `resources.enabled` | `false` | 设为 `true`，并单独部署 `resource-site/`（见「资源站搭建教程」） |
| 临时邮箱 | `tempMail.enabled` | `false` | 设为 `true`，并在 Cloudflare 部署收信 Worker + D1 + Email Routing |
| 文章朗读 | 文章 frontmatter `audio: true` | 不设置即关闭 | 在文章顶部加 `audio: true`，并配置 `SILICONFLOW_API_KEY` + R2 |
| 网盘 | 导航项 `enabled` | `false` | 导航项改为 `enabled: true` + 部署 `/api/drive/*`（R2/S3 + KV） |
| 短链 | 导航项 `enabled` | `false` | 导航项改为 `enabled: true` + 部署 `/api/shorten/*` |

> 说明：评论 / 临时邮箱 / 文章朗读属「零依赖或轻依赖」，配好即用；站内 AI 助手 / 资源站 / 网盘 / 短链 依赖边缘函数与外部服务（Neon / Supabase / R2 / Cloudflare），需在部署平台配置对应环境变量。各功能的完整配置见下方「功能特性」与各 `docs/*.md`。

## 🛠 开发工具：右键样式编辑器（仅本地 `astro dev`）

本地 `astro dev` 运行时**直接定死右键可用**，无需开关：在页面任意位置**右键**即弹出样式编辑器，边看边调。面板内**不使用任何表情符号**，图标一律为内联 SVG；所有可调属性均标注**中文 / 日文 / 英文**三语。

- **元素**：编辑右键所点元素的内联样式（文字/背景颜色、字号、字重、内边距、外边距、圆角、边框、对齐、行高、不透明度）。
- **上传媒体替换**：元素面板顶部「上传图片 / 画像 / Image」按钮（SVG 图标），支持 **图片 / GIF / 视频**：
  - 右键 **`<img>`**（如头图、精选分类图）→ 直接替换其 `src`；若右键的是包裹图片的容器，会自动定位其中的 `<img>` 一并替换。
  - 右键**带背景图的元素**（如背景图区域）→ 替换其 `background-image`；上传**视频**则注入一个绝对定位的 `<video>` 覆盖层作为动态背景。
  - 内容以 base64 / blob 注入，**刷新后还原**（开发期调试用，不写盘）。
- **主题变量**：按当前「亮色 / 暗色」分别编辑全局 CSS 变量（SVG 太阳 / 月亮 图标切换）。变量以**自然语言说明**呈现（如「页面背景色 / ページ背景 / Page background」），技术变量名仅作小号代码注记。改动注入 `<style>` 并持久化到 `localStorage`，刷新后保留；「复制 CSS」可导出，「重置」恢复默认。
- 面板**不显示滚动条**（已隐藏，主题变量区改双列网格压缩高度）；点击面板外空白处自动关闭；面板配色**使用博客主题变量**，自动跟随亮/暗主题。

> ⚠️ 该功能**仅在 `import.meta.env.DEV` 下挂载**（`src/layouts/Layout.astro` 中以 `{import.meta.env.DEV && <StyleEditor />}` 包裹，`src/components/dev/StyleEditor.tsx` 组件内亦有兜底守卫）。`astro build` 时被自动 tree-shake，**不进入生产产物**，对线上访客零影响。

## 安全响应头

两个边缘函数（`edge-functions/api/[[default]].js` 与 `resource-site/edge-functions/api/[[default]].js`）已为**所有 API 响应**统一注入安全头（经 `getCorsHeaders()` spread，一处覆盖全部 JSON / 流式 / 代理响应）：

| 响应头 | 值 |
| --- | --- |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `X-Frame-Options` | `SAMEORIGIN`（非 `DENY`，保证网盘内联预览的同站 `<iframe>` 不被阻断） |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains`（未上 preload 列表，不加 `preload`） |

**静态资源**（HTML / JS / CSS / 字体 / 图片）的安全头需在 **EdgeOne 控制台 → 站点加速 → 配置 → HTTP 响应头（修改响应头）** 中按文件后缀统一添加上述同样的头（CDN 缓存层注入，被缓存的资源也带安全头）。CSP 暂未启用（站内有 AdSense 与内联脚本，需单独审计）。

> **可选加固**：在 **EdgeOne 控制台 → 安全防护 → 速率限制** 给写入类接口配「客户端 IP 60s 内 ≥1 次 → 拦截 429」，覆盖 `POST /api/comment-image`、`POST /api/drive/upload-init`、`POST /api/temp-mail/address`，防滥发。EdgeOne 边缘直接判真实客户端 IP（`EO-Connecting-IP`），不会因 CDN 聚合误伤全体用户。

## 技术栈

- **Astro 5**（SSG）+ 定制主题，支持中文 / English / 日本語 三语（`[lang]/` 镜像路由）。
- **部署平台：EdgeOne Makers**（腾讯云边缘函数 / 云函数）。站点 `qiyuan.icu` 跑在边缘，全文搜索用 Pagefind。
- **边缘运行时**：
  - `edge-functions/api/[[default]].js` —— EdgeOne 边缘函数单体，承载 RAG 聊天、临时邮箱、评论、上传、MCP、统计等全部 API。
  - `cloud-functions/` —— Makers 云函数（如博客图床上传 `api/images/upload`）。
- **外部依赖**：Neon（Postgres + pgvector，博客文章向量库）、Supabase（资源站向量库）、硅基流动（bge-m3 / bge-reranker 嵌入重排）、商汤 sensenova + ModelScope + 智谱（生成模型）、Cloudflare（KV 评论存储 + R2 评论图 + 临时邮箱 Worker/D1）。

## 功能特性

- **博客文章**：Markdown/MDX，封面图，目录，Pagefind 站内搜索；支持按语言切换。
- **站内 AI 助手（RAG）「就这篇文章问 AI」**：
  - 检索：博客文章（Neon + pgvector `rag_posts` 余弦检索）+ 资源站（Supabase `products` **混合检索**：向量 + 词法 `ilike`，RRF 融合），各取候选经重排后送入上下文。
  - 嵌入 `BAAI/bge-m3`、重排 `BAAI/bge-reranker-v2-m3`（均经硅基流动，免费）。
  - 生成：**首选商汤 sensenova `deepseek-v4-flash`（多密钥轮询、关闭思考模式）**，兜底 ModelScope / 智谱 GLM / 硅基流动 DeepSeek。
  - **使用的大模型平台**：
    - **硅基流动（SiliconFlow）**：嵌入 `BAAI/bge-m3` + 重排 `BAAI/bge-reranker-v2-m3`（免费），并作生成最终兜底（DeepSeek）。
    - **商汤 sensenova**：生成首选，模型 `deepseek-v4-flash`（多密钥轮询、关闭思考模式）。
    - **ModelScope 魔搭**：生成兜底，`Llama-3.3-70B`（国内直连免费）。
    - **智谱 GLM**：生成兜底，`GLM-4.7-Flash`（永久免费、国内直连）。
  - 性能优化：**Neon 预热**（请求内 `SELECT 1` 与嵌入并发，消除 scale-to-zero 冷启动）、**问题向量缓存**（LRU 5 条，相同问题跳过重复嵌入调用）。
- **临时邮箱** `qiyuanmail.cc.cd`：Cloudflare Email Routing → Worker → D1（`temp_addresses` / `temp_messages`）；Turnstile 人机验证；前端支持收件箱、自动刷新、HTML 邮件渲染（链接新标签打开）。
  - ⚠️ 收信 Worker + D1 + Email Routing 需在 **Cloudflare 控制台**自行部署（代码见 `cloudflare/`）；本仓库的边缘函数只负责 UI 与读信/生成地址。
- **评论系统**：评论存 **Cloudflare KV**，图片存 **Cloudflare R2**（经上传 Worker 直写，无需 S3 密钥）；`config/site.yaml` 中 `comment.provider` 默认 `none`（可选 `custom` / `giscus` / `waline` / `twikoo`）。
- **R2 独立图床**：评论图走 `r2.qiyuan.icu`（国内经 EdgeOne 边缘回源 Cloudflare，浏览器全程只碰腾讯网络）。
- **文章朗读（Edge TTS 预生成音频）**：文章 frontmatter 加 `audio: true` 即生成中文朗读 mp3。流程为**发布前本地**用 Edge TTS 合成 → 上传 Cloudflare R2（`audio/<slug>.mp3`，经 `r2.qiyuan.icu` CDN）→ 前端播放器点击播放（**非**运行时实时合成，体验更稳）。清单 `src/assets/audio-manifest.json` 记录每篇 `slug → { url, voice, chars, bytes, generatedAt }`，文章页据此显示播放器。
  - 音频 URL 自动带缓存破坏参数 `?v=<mp3 内容 sha256 前 12 位>`：R2/EdgeOne 对未知 query 参数按同一对象返回，但浏览器/CDN 以完整 URL 作缓存键，故音频内容更新后 URL 必变、强制重新拉取，避免旧 mp3 被长期缓存（R2 默认 `Cache-Control: max-age=604800`）。
  - 生成：`npm run generate:audio`（增量，内容+音色哈希命中则跳过）；`-- --force` 全量重生成；`-- --local` 强制落本地 `public/audio/`。增量缓存存 `.cache/audio-cache.json`。
- **短链（Short URL）**：把长链接缩短成 `{origin}/api/s/<slug>`。存储于 Cloudflare KV（与评论同命名空间，前缀 `short:`）；支持自定义短码（3–32 位字母数字 `_-`）或自动生成 6 位随机码；仅接受 `http/https` 目标；访问 `/api/s/<slug>` 即 302 跳转到原链接，不存在返回 404。需配置 `CF_KV_*`。
- **公开网盘（Netdisk）** `/drive`：浏览器经 S3 presigned PUT 直传 Cloudflare R2，文件元数据存 Cloudflare KV；单文件默认上限 500MB（`DRIVE_MAX_BYTES` 可覆盖）。提供上传初始化 `/api/drive/upload-init`、完成回调 `/api/drive/upload-complete`、列表 `/api/drive/list`、分享页元数据 `/api/drive/meta/:token`。**文件 24 小时后自动删除**（KV `expirationTtl`，`DRIVE_TTL_HOURS` 可改时长），需配合 Cloudflare 控制台 R2 桶 Lifecycle 规则（前缀 `drive/`）才能真正清理对象。需配置 `R2_*` 与 `CF_KV_*`。

## 本地开发

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # 构建到 dist/
npm run preview  # 预览构建结果
```

> 需要 **Node.js 18.17.1+**（推荐 20+）与 npm 9+。

> RAG 相关脚本（可选，CI/部署时通常自动跑）：`npm run index:neon`（文章向量）、`npm run index:resources`（资源向量回填）、`npm run generate:summaries` 等。

> 文章朗读音频需**本地预生成**：`npm run generate:audio` 合成并上传 R2 后，须提交 `src/assets/audio-manifest.json`（部署只读取清单、不生成音频）。新增或编辑 `audio: true` 文章后务必重跑本命令。

## 环境变量（EdgeOne 控制台）

边缘函数通过环境变量注入密钥，本仓库代码**不包含任何密钥**。

### RAG 必需

| 变量                                      | 说明                                           |
| --------------------------------------- | -------------------------------------------- |
| `SILICONFLOW_API_KEY`                   | 嵌入(bge-m3)/重排(bge-reranker) 必需；文本生成也复用它作最后兜底 |
| `NEON_SERVERLESS_URL`                   | 博客文章向量库 `rag_posts`（pgvector）连接串，必需          |
| `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` | 资源站向量库 `products` 连接信息，必需                    |

### 生成模型（首选 + 兜底）

| 变量                   | 说明                                                                          |
| -------------------- | --------------------------------------------------------------------------- |
| `SENSENOVA_API_KEYS` | **生成首选**；多把密钥用逗号/换行分隔，按顺序轮询，全部失败才顺延下一个平台；模型固定 `deepseek-v4-flash`，思考模式已强制关闭 |
| `MODELSCOPE_API_KEY` | 可选兜底，ModelScope 魔搭 `Llama-3.3-70B`（国内直连免费）                                  |
| `ZHIPU_API_KEY`      | 可选兜底，智谱 `GLM-4.7-Flash`（永久免费、国内直连）                                          |

### 评论 / R2 图床

| 变量                                                                                            | 说明                                                                                              |
| --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `CF_KV_NAMESPACE_ID` / `CF_KV_API_TOKEN`                                                      | Cloudflare KV（**评论 + 短链**存储），必需（否则评论/短链接口 503）                                                  |
| `CF_ACCOUNT_ID`                                                                               | Cloudflare 账户 ID（R2 / KV 共用，默认已知可不改）                                                            |
| `UPLOAD_WORKER_URL` / `UPLOAD_WORKER_KEY`                                                     | 上传 Worker（R2 绑定直写评论图，优先于 S3 直传）                                                                 |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET` / `R2_PUBLIC_URL` | 文章朗读**音频**与**网盘**上传 R2 所用的 S3 凭据（评论图已改走上传 Worker，但音频与网盘仍走 S3 直传）；缺省则音频落本地 `public/audio/`、网盘不可用 |

### 网盘 / 短链

| 变量                | 说明                                                                                           |
| ----------------- | -------------------------------------------------------------------------------------------- |
| `DRIVE_TTL_HOURS` | 网盘文件存活时长（小时），默认 `24`；到期由 KV `expirationTtl` 自动标记失效，并需配合 R2 桶 Lifecycle 规则（前缀 `drive/`）真正删除对象 |
| `DRIVE_MAX_BYTES` | 网盘单文件大小上限（字节），默认 `524288000`（500MB）                                                          |

> 短链复用上方 `CF_KV_*`；网盘复用上方 `R2_*` 与 `CF_KV_*`。

### 临时邮箱

| 变量                 | 说明                        |
| ------------------ | ------------------------- |
| `TEMP_MAIL_D1_ID`  | D1 数据库 ID                 |
| `CF_D1_API_TOKEN`  | D1 读写 Token（含 D1:Edit 权限） |
| `TURNSTILE_SECRET` | Turnstile 私密密钥（注意：不是站点密钥） |
| `TEMP_MAIL_DOMAIN` | 可选，默认 `qiyuanmail.cc.cd`  |

### 资源站（可选）

| 变量                | 说明                                                           |
| ----------------- | ------------------------------------------------------------ |
| `JWT_SECRET`      | 资源站用户登录 JWT 签名密钥（**必填**，否则 `/api/auth/*` 报错）                 |
| `PUBLISH_KEY`     | MCP 发布与图片上传密钥（同时用于 `/api/publish` 与 `/api/images/upload`），可选 |
| `PUBLIC_BASE_URL` | 公开站点基址，如 `https://www.qiyuan.icu`，用于生成分享 / SEO 链接            |

> 资源站是**独立部署**的项目，博客只是**引用**它的数据。完整步骤见下方「资源站搭建教程」。

## 资源站搭建教程

> ⚠️ **资源站与博客是两个相互独立的部署**，不要混为一谈：
>
> - **资源站**（网盘资源分享站）：一个**单独的 EdgeOne 项目**，源码在本仓库的 [`resource-site/`](./resource-site/) 子目录，拥有自己的边缘函数、Supabase 数据库与（可选）前端页面，需**单独部署**、绑定自己的域名（如 `resources.qiyuan.icu`）。
> - **博客**：通过共用同一套 Supabase 数据库 + `RESOURCES_API_PROXY` 指向资源站域名来**引用**资源数据，在内置「资源」页（`/resources`）中展示、搜索、获取网盘链接。
>
> 也就是说：**先把 `resource-site/` 当作独立项目部署好，博客再指过去。** 二者可共用同一个 Supabase 项目，也可各自独立。

### 架构

```
                    ┌──────────────────── 资源站（独立部署，resource-site/）
浏览器               │   EdgeOne 项目 A（域名如 resources.qiyuan.icu）
 ├─ 资源站站点 ──────┤     ├─ edge-functions/api/[[default]].js（认证/商品/评论/图片/MCP）
 │                  │     └─ Supabase（users / products / reviews / orders；product-images 桶）
 │                  └────────────────────
 │
 └─ 博客「资源」页 ──→ EdgeOne 项目 B（博客，本仓库根目录）
        /resources        └─ /api 经 RESOURCES_API_PROXY 引用资源站，或直连同一套 Supabase 读取 products
```

### 一、部署资源站（独立项目）

源码见 [`resource-site/`](./resource-site/)，详细文档见 [`resource-site/README.md`](./resource-site/README.md)。

1. **建库与 RLS**：在 Supabase SQL Editor 依次执行：
   - [`resource-site/database/schema.sql`](./resource-site/database/schema.sql)（建表：`users` / `products` / `reviews` / `orders` / `quark_orders`）
   - [`resource-site/database/rls_policies.sql`](./resource-site/database/rls_policies.sql)（RLS：`users` 对 anon 完全不可见，商品匿名只读上架）
2. **建 Storage 桶**：创建 `product-images` 桶并设为公开（或经 `/api/images/*` 代理）。
3. **单独部署 `resource-site/`**：将该目录作为独立 EdgeOne 项目部署（边缘函数 + 可选静态前端），并在其控制台配置环境变量：
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_KEY=eyJ...      # 服务端密钥
   JWT_SECRET=***                    # 资源站登录 JWT 签名密钥（必填）
   ```
   > 前端页面（`public/*.html`）未随模板附带，可自行编写或从原站取用；仅需 API 时可只部署边缘函数。

### 二、让博客引用资源站

1. **数据层**：博客与资源站**共用同一套 Supabase**。如需 RAG 语义搜索，在 Supabase 执行 [`database/products_embedding.sql`](./database/products_embedding.sql) 为 `products` 加向量列；分类多语言可选执行 [`database/resource_category_i18n.sql`](./database/resource_category_i18n.sql)。
2. **配置指向**：博客侧设置 `RESOURCES_API_PROXY` 指向资源站域名（如 `https://resources.qiyuan.icu`），本地开发时 `npm run dev` 会据此代理 `/api`。
3. **开启资源页**：`config/site.yaml` 中 `resources.enabled: true`（默认已开），按需改 `label` / `icon` / `ownerUserId`。
4. **部署博客**：推送到 Git，EdgeOne Makers 自动构建并发布。

### 验证

```bash
# 对资源站域名验证
curl https://resources.your-domain.com/api/categories
curl "https://resources.your-domain.com/api/products?limit=2"
```

返回 JSON 即说明资源站已正常工作。管理后台可注册账号、发布商品（密码需同时包含大写 + 小写 + 数字 + 符号）。

### 更多文档

- [资源站独立部署说明](./resource-site/README.md) 与 [部署指南](./resource-site/docs/DEPLOYMENT.md)
- [资源站 API 接口](./resource-site/docs/API.md)
- [资源站数据库结构](./resource-site/docs/DATABASE.md)
- [博客侧资源引用配置（详细）](./docs/resources-deployment.md)
- [AI 资源发布提示词](./docs/ai-resources-publisher-prompt.md)

## 站点配置

主配置在 `config/site.yaml`，常用项：

| 配置项                            | 说明                                                            |
| ------------------------------ | ------------------------------------------------------------- |
| `site.title` / `site.subtitle` | 站点标题与副标题                                                      |
| `site.name` / `site.author`    | 作者名称                                                          |
| `site.avatar`                  | 头像路径（当前 `/img/avatar.svg`，可换 `.jpg`/`.webp`）                  |
| `site.url`                     | 站点 URL，用于 RSS 与 SEO                                           |
| `site.startYear`               | 建站年份                                                          |
| `tempMail.domain`              | 临时邮箱域名（默认 `qiyuanmail.cc.cd`）                                 |
| `turnstileSiteKey`             | Turnstile 站点密钥（公开，用于前端渲染验证框）                                  |
| `comment.provider`             | 评论提供商，默认 `none`（可选 `custom` / `giscus` / `waline` / `twikoo`） |

替换头像：将图片放到 `public/img/avatar.svg`（或同名 `.jpg`/`.webp`），并同步更新 `public/favicon.ico`（favicon 由头像生成）。

## 如何添加文章

1. 在 `src/content/blog/` 新建 Markdown/MDX 文件，如 `my-post.md`。
2. 在文件顶部写 frontmatter：

```md
---
title: 我的文章标题
description: 一句话摘要
pubDate: 2026-06-05
heroImage: ./cover.png   # 可选，封面放同级或子目录
categories:
  - 笔记
tags:
  - 标签一
audio: true        # 可选：设为 true 即生成该篇文章的 Edge TTS 中文朗读音频（详见上方「文章朗读」）
---

正文内容写在这里…
```

1. 封面图规则：
   - 与文章同目录：`heroImage: ./cover.png`
   - 在子目录：`heroImage: ./my-post/cover.png`
2. 保存后本地 `npm run dev` 预览，或 `npm run build` 构建。

> `pubDate` / `heroImage` 会自动映射为 `date` / `cover`，与 `src/content.config.ts` 中的 schema 对齐。

修改图片后建议运行 `npm run generate:lqips` 更新占位渐变。

## 目录结构

| 路径                                  | 说明                                                                             |
| ----------------------------------- | ------------------------------------------------------------------------------ |
| `config/site.yaml`                  | 站点主配置                                                                          |
| `src/pages/`                        | 页面路由（含 `[lang]/` 多语言镜像）                                                        |
| `src/content/blog/`                 | 文章集合（Markdown/MDX）                                                             |
| `src/components/`                   | UI 组件（含 `tempmail/`、`chat/`）                                                   |
| `src/layouts/`                      | 页面布局                                                                           |
| `edge-functions/api/[[default]].js` | EdgeOne 边缘函数：RAG 聊天 / 临时邮箱 / 评论 / 上传 / MCP / 统计                                |
| `cloud-functions/`                  | Makers 云函数（博客图床上传等）                                                            |
| `cloudflare/`                       | 临时邮箱收信 Worker、D1 schema、wrangler 配置（需自行部署到 Cloudflare）                         |
| `public/`                           | 静态资源（favicon、图片、字体等）                                                           |
| `scripts/generate-audio.mjs`        | 文章朗读音频生成（Edge TTS → R2/CDN，产出 `src/assets/audio-manifest.json`）                |
| `src/assets/audio-manifest.json`    | 音频清单：`slug → { url, voice, chars, bytes, generatedAt }`，`url` 带 `?v=<哈希>` 缓存破坏 |

## 部署

推送到 Git 后由 **EdgeOne Makers** 自动构建（`npm run build`）并发布，边缘函数随仓库部署。**部署前需在 EdgeOne 控制台填好上面对应的环境变量**（尤其 `SILICONFLOW_API_KEY` / `NEON_SERVERLESS_URL` / `SUPABASE_*` / `SENSENOVA_API_KEYS` / `CF_KV_*`）。

临时邮箱功能另需在 **Cloudflare 控制台**完成：部署 `cloudflare/` 下的收信 Worker、建 D1 表、配置 Email Routing catch-all → Worker、配置 Turnstile。详见各文件内注释。

## 许可证

本项目以 **MIT 许可证** 开源（详见 [LICENSE](./LICENSE)）。你可以自由 fork、修改、部署为自己的博客，只需保留版权与许可证声明；商业用途亦可，风险自负。
