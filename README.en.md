[中文](./README.md) | [English](./README.en.md) | [日本語](./README.ja.md)

# qiyuan-blog-template

> 🚀 **A full-featured Astro blog template with built-in AI Q&A** — ships with RAG on-site assistant, article TTS, comments, netdisk, short links and a resource store, deployable on EdgeOne Makers, ready to use out of the box.

[![Demo](https://img.shields.io/badge/Demo-Online-blue?style=flat-square)](https://www.qiyuan.icu)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

A deeply customized personal blog and tech resource-site template based on [Astro](https://astro.build) (derived from the [Koharu](https://github.com/koharu-org/koharu) theme). Live demo: [https://www.qiyuan.icu](https://www.qiyuan.icu).

## Feature Screenshots

![qiyuan blog homepage](https://cdn.jsdelivr.net/gh/violet27chen/qiyuan-blog-template@main/screenshots/home.jpg)

> The screenshot above is the **demo site (qiyuan.icu, all optional features enabled)** homepage: top Hero video area, author card, article list, in-site AI assistant floating widget, and the Resources / Netdisk / Short-link entries in the navbar. The template disables these optional features by default — enable them after cloning as needed.

| Music Playlist | Temp Mail |
| --- | --- |
| ![Music playlist page](https://cdn.jsdelivr.net/gh/violet27chen/qiyuan-blog-template@main/screenshots/music.png) | ![Temp mail page](https://cdn.jsdelivr.net/gh/violet27chen/qiyuan-blog-template@main/screenshots/tempmail.png) |

| Netdisk | Resource Store |
| --- | --- |
| ![Netdisk page](https://cdn.jsdelivr.net/gh/violet27chen/qiyuan-blog-template@main/screenshots/netdisk.png) | ![Resource store page](https://cdn.jsdelivr.net/gh/violet27chen/qiyuan-blog-template@main/screenshots/resources.jpg) |

> This repo **`qiyuan-blog-template`** is a **blog template**: click **Use this template** on the GitHub repo page to create your own blog repo in one click, then modify `config/site.yaml`, add your posts, configure environment variables and deploy. Deployment is recommended on the China-friendly **EdgeOne Makers** — see "Using as a Template" below (the resource store is a separate sub-project that must be deployed on its own, see "Resource Store Setup").

## Permanent Free Usage

**All features of this template (including comments, in-site AI assistant, resource store, temp mail, article TTS, short links, netdisk) can be used permanently free within each provider's free quota — no payment is ever forced.** The table below lists the external service each feature depends on and its current free quota (verified 2026-07; refer to each vendor's official site for the latest):

| Feature | Depends on | Free quota (current) |
| --- | --- | --- |
| Site hosting + all APIs (RAG / temp mail / comments / upload / MCP / stats) | EdgeOne Makers | Edge functions 3M/mo, cloud functions 1M/mo, KV / Blob 1 GB each, 500 builds/mo, 200 custom domains, free SSL; site-acceleration traffic/requests unlimited during the promo period (free tier excludes video/large-file delivery acceleration — this site's videos and netdisk files are uploaded directly via R2, not consuming that acceleration quota) |
| In-site AI assistant · blog post vector store | Neon (Postgres + pgvector) | Permanent free: 0.5 GB storage/project, 100 CU-hours/mo, 100 projects, 5 GB egress/mo (auto-scales to zero when idle) |
| In-site AI assistant · resource-store vector store | Supabase | Permanent free: 500 MB DB, 1 GB file storage, 5 GB bandwidth/mo, 50k MAU, unlimited API requests (pauses after 7 idle days) |
| In-site AI assistant · embedding / rerank | SiliconFlow bge-m3 / bge-reranker | Permanent free, direct from mainland China, 1000 RPM |
| In-site AI assistant · generation model | Zhipu GLM-4.7-Flash (preferred fallback) | Permanent free (200K context); ModelScope Llama-3.3-70B 2000 calls/day free; SenseTime deepseek-v4-flash free in public beta (several hundred calls per 5h) |
| Comment storage | Cloudflare KV | 100k reads/day, 1000 writes/day, 1000 deletes/day, 1 GB storage |
| Comment images / TTS audio / netdisk objects | Cloudflare R2 | 10 GB storage/mo, 1M Class A ops, 10M Class B ops/mo, free egress |
| Comment images / netdisk upload Worker | Cloudflare Workers | 100k requests/day |
| Temp mail (receive / store / verify) | Cloudflare D1 + Email Routing + Turnstile | D1 5 GB storage / 5M row reads/day; Email Routing free; Turnstile free unlimited |
| Short-link storage | Cloudflare KV | Shares the same namespace quota as comments (key prefix `short:`) |

> **Notes**:
> - **Permanent-free tier** (long-term valid): Neon, Supabase, Cloudflare (Workers/KV/R2/D1/Email Routing/Turnstile), SiliconFlow embedding/rerank, Zhipu GLM-4.7-Flash.
> - **Currently time-limited free / public beta**: EdgeOne Makers acceleration traffic is in its promo period; SenseTime sensenova (deepseek-v4-flash) is a free public beta whose quota/policy may change when the beta ends — but the template has **built-in multi-platform fallback** (Zhipu GLM-4.7-Flash permanent free, ModelScope 2000 free/day), so any single platform change will not break the AI assistant.
> - **Article TTS audio is pre-generated locally** (Edge TTS, via Microsoft's free speech endpoint — no key, no cost); after generation it only consumes Cloudflare R2 storage quota.
> - As long as usage stays within the quotas above, the whole blog (including all optional features) runs **permanently at zero cost**; you only pay per-use after exceeding free quotas (e.g. Supabase scaling, Cloudflare overage, Neon compute upgrade).

## 🚀 Using as a Template

1. Go to the **`qiyuan-blog-template`** repo page, click **Use this template → Create a new repository**, and name your new repo (any name).
2. `git clone` it locally, then `npm install`.
3. Copy `.env.example` to `.env` and fill in the environment variables per feature (leave blank to auto-disable that feature).
4. Edit `config/site.yaml`: change `site.title` / `url` / `avatar` / `social` to your own info.
5. Delete `src/content/blog/welcome.md` and drop in your own `.md` posts.
6. Deploy to EdgeOne Makers (or any Astro-compatible platform), configuring the same key-value pairs in the platform's environment variables as in `.env`.

## Optional Features Disabled by Default

To keep the template clean out of the box, **all optional features below are disabled by default** and can be enabled after cloning:

| Feature | Config switch | Default | How to enable |
| --- | --- | --- | --- |
| Comments | `comment.provider` | `none` (off) | Change to `giscus` / `waline` / `twikoo` / `custom` and fill its config |
| In-site AI assistant (RAG) | `rag.enabled` | `false` | Set `true`, and configure `SILICONFLOW_API_KEY` / `NEON_SERVERLESS_URL` etc. |
| Resource store | `resources.enabled` | `false` | Set `true`, and deploy `resource-site/` separately (see "Resource Store Setup") |
| Temp mail | `tempMail.enabled` | `false` | Set `true`, and deploy the receiving Worker + D1 + Email Routing on Cloudflare |
| Article TTS | post frontmatter `audio: true` | off when unset | Add `audio: true` at the top of a post, and configure `SILICONFLOW_API_KEY` + R2 |
| Netdisk | nav item `enabled` | `false` | Set nav item `enabled: true` + deploy `/api/drive/*` (R2/S3 + KV) |
| Short link | nav item `enabled` | `false` | Set nav item `enabled: true` + deploy `/api/shorten/*` |

> Note: comments / temp mail / article TTS are "zero- or light-dependency" and work once configured; the in-site AI assistant / resource store / netdisk / short links depend on edge functions and external services (Neon / Supabase / R2 / Cloudflare) and require corresponding env vars on the deploy platform. Full config for each is in "Feature Highlights" below and each `docs/*.md`.

## 🛠 Dev Tool: Right-Click Style Editor (local `astro dev` only)

When running **local `astro dev`**, right-click is **hard-wired to open the style editor — no toggle needed**: right-click anywhere on the page and the editor pops up for live tweaking. The panel uses **no emojis** — all icons are inline SVG; every adjustable property is labeled in **Chinese / Japanese / English**.

- **Element**: edit the inline styles of the right-clicked element (text/background color, font size, font weight, padding, margin, border-radius, border, alignment, line-height, opacity).
- **Upload media to replace**: the "Upload image / 画像 / Image" button (SVG icon) at the top of the element panel supports **image / GIF / video**:
  - Right-click an **`<img>`** (e.g. hero image, featured-category image) → replaces its `src` directly; if you right-click a container that wraps an image, it auto-locates the inner `<img>` and replaces it too.
  - Right-click an element **with a background image** (e.g. a background region) → replaces its `background-image`; uploading a **video** injects an absolutely-positioned `<video>` overlay as an animated background.
  - Content is injected as base64 / blob and **resets after refresh** (for dev-time debugging only, not written to disk).
- **Theme variables**: edit global CSS variables per current "light / dark" mode (toggle with SVG sun / moon icons). Variables are shown by **plain-language description** (e.g. "Page background / ページ背景 / Page background"); the technical variable name is only a small code footnote. Changes are injected into `<style>` and persisted to `localStorage` (kept after refresh); "Copy CSS" exports it, "Reset" restores defaults.
- The panel **shows no scrollbar** (hidden; theme-variable area uses a two-column grid to shrink height); clicking outside the panel auto-closes it; the panel **uses the blog's theme variables** so it follows light/dark automatically.

> ⚠️ This feature is **only mounted under `import.meta.env.DEV`** (wrapped in `{import.meta.env.DEV && <StyleEditor />}` in `src/layouts/Layout.astro`, with a fallback guard inside `src/components/dev/StyleEditor.tsx`). It is auto tree-shaken on `astro build` and **never enters production output**, having zero impact on live visitors.

## Security Response Headers

Both edge functions (`edge-functions/api/[[default]].js` and `resource-site/edge-functions/api/[[default]].js`) uniformly inject security headers into **all API responses** (spread via `getCorsHeaders()`, covering all JSON / streaming / proxy responses in one place):

| Header | Value |
| --- | --- |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `X-Frame-Options` | `SAMEORIGIN` (not `DENY`, so the same-site `<iframe>` for netdisk inline preview is not blocked) |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains` (not on the preload list — no `preload`) |

**Static assets** (HTML / JS / CSS / fonts / images) security headers must be added in **EdgeOne console → Site Acceleration → Configuration → HTTP Response Headers (modify response headers)**, applied by file extension with the same headers above (injected at the CDN cache layer, so cached assets also carry them). CSP is not enabled yet (the site has AdSense and inline scripts that need a separate audit).

> **Optional hardening**: in **EdgeOne console → Security → Rate Limiting**, add a rule for write APIs — "client IP ≥1 request within 60s → block 429", covering `POST /api/comment-image`, `POST /api/drive/upload-init`, `POST /api/temp-mail/address`, to prevent abuse. EdgeOne judges the real client IP at the edge (`EO-Connecting-IP`), so it won't falsely block everyone due to CDN aggregation.

## Tech Stack

- **Astro 5** (SSG) + custom theme, with Chinese / English / 日本語 three-language support (`[lang]/` mirrored routes).
- **Deploy platform: EdgeOne Makers** (Tencent Cloud edge functions / cloud functions). Site `qiyuan.icu` runs at the edge; full-text search uses Pagefind.
- **Edge runtime**:
  - `edge-functions/api/[[default]].js` — a single EdgeOne edge function carrying all APIs: RAG chat, temp mail, comments, upload, MCP, stats.
  - `cloud-functions/` — Makers cloud functions (e.g. blog image-upload `api/images/upload`).
- **External dependencies**: Neon (Postgres + pgvector, blog post vectors), Supabase (resource-store vectors), SiliconFlow (bge-m3 / bge-reranker embedding & rerank), SenseTime sensenova + ModelScope + Zhipu (generation models), Cloudflare (KV comment storage + R2 comment images + temp-mail Worker/D1).

## Feature Highlights

- **Blog posts**: Markdown/MDX, cover image, table of contents, Pagefind on-site search; switchable by language.
- **In-site AI assistant (RAG) "Ask AI about this article"**:
  - Retrieval: blog posts (Neon + pgvector `rag_posts` cosine) + resource store (Supabase `products` **hybrid retrieval**: vector + lexical `ilike`, RRF fusion), candidates reranked before entering context.
  - Embed `BAAI/bge-m3`, rerank `BAAI/bge-reranker-v2-m3` (both via SiliconFlow, free).
  - Generation: **preferred SenseTime sensenova `deepseek-v4-flash` (multi-key round-robin, thinking mode off)**, falling back to ModelScope / Zhipu GLM / SiliconFlow DeepSeek.
  - **LLM platforms used**:
    - **SiliconFlow**: embedding `BAAI/bge-m3` + rerank `BAAI/bge-reranker-v2-m3` (free), and final generation fallback (DeepSeek).
    - **SenseTime sensenova**: preferred generation, model `deepseek-v4-flash` (multi-key round-robin, thinking off).
    - **ModelScope**: generation fallback, `Llama-3.3-70B` (free, direct from mainland China).
    - **Zhipu GLM**: generation fallback, `GLM-4.7-Flash` (permanent free, direct from mainland China).
  - Performance: **Neon warm-up** (in-request `SELECT 1` concurrent with embedding, killing scale-to-zero cold start), **question-vector cache** (LRU 5, skips duplicate embedding for identical questions).
- **Temp mail** `qiyuanmail.cc.cd`: Cloudflare Email Routing → Worker → D1 (`temp_addresses` / `temp_messages`); Turnstile human verification; frontend supports inbox, auto-refresh, HTML mail rendering (links open in new tab).
  - ⚠️ The receiving Worker + D1 + Email Routing must be deployed on **Cloudflare console** yourself (code in `cloudflare/`); this repo's edge function only handles UI and reading/address generation.
- **Comments**: comments in **Cloudflare KV**, images in **Cloudflare R2** (written directly via upload Worker, no S3 key needed); `comment.provider` in `config/site.yaml` defaults to `none` (optional `custom` / `giscus` / `waline` / `twikoo`).
- **R2 standalone image host**: comment images go through `r2.qiyuan.icu` (in mainland China, EdgeOne edge backhauls to Cloudflare, browser only touches Tencent's network).
- **Article TTS (Edge TTS pre-generated audio)**: adding `audio: true` to a post's frontmatter generates a Chinese TTS mp3. Flow: **locally pre-generate** with Edge TTS before publishing → upload to Cloudflare R2 (`audio/<slug>.mp3` via `r2.qiyuan.icu` CDN) → frontend player plays on click (**not** real-time synthesis at runtime, more stable). Manifest `src/assets/audio-manifest.json` records each `slug → { url, voice, chars, bytes, generatedAt }`; the post page shows the player accordingly.
  - Audio URL auto-carries a cache-buster `?v=<first 12 chars of mp3 sha256>`: R2/EdgeOne returns the same object for unknown query params, but browser/CDN uses the full URL as cache key, so after audio content updates the URL must change, forcing a re-fetch and avoiding stale mp3 being cached long-term (R2 default `Cache-Control: max-age=604800`).
  - Generate: `npm run generate:audio` (incremental, skips on content+voice hash hit); `-- --force` for full regeneration; `-- --local` to force local `public/audio/`. Incremental cache in `.cache/audio-cache.json`.
- **Short URL**: shorten a long link to `{origin}/api/s/<slug>`. Stored in Cloudflare KV (same namespace as comments, prefix `short:`); supports custom short code (3–32 alphanumerics `_-`) or auto 6-char random; only accepts `http/https` targets; visiting `/api/s/<slug>` 302-redirects to the original, 404 if not found. Requires `CF_KV_*`.
- **Public Netdisk** `/drive`: browser uploads directly to Cloudflare R2 via S3 presigned PUT; file metadata in Cloudflare KV; per-file default limit 500MB (`DRIVE_MAX_BYTES` override). Provides upload-init `/api/drive/upload-init`, complete callback `/api/drive/upload-complete`, list `/api/drive/list`, share-page metadata `/api/drive/meta/:token`. **Files auto-delete after 24h** (KV `expirationTtl`, `DRIVE_TTL_HOURS` adjustable), needs Cloudflare console R2 bucket Lifecycle rule (prefix `drive/`) to actually purge objects. Requires `R2_*` and `CF_KV_*`.

## Local Development

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # build to dist/
npm run preview  # preview the build
```

> Requires **Node.js 18.17.1+** (20+ recommended) and npm 9+.

> RAG scripts (optional, usually auto-run in CI/deploy): `npm run index:neon` (post vectors), `npm run index:resources` (resource vector backfill), `npm run generate:summaries`, etc.

> Article TTS audio must be **pre-generated locally**: after `npm run generate:audio` synthesizes and uploads to R2, you must commit `src/assets/audio-manifest.json` (deploy only reads the manifest, does not generate audio). Always rerun this command after adding or editing an `audio: true` post.

## Environment Variables (EdgeOne console)

Edge functions inject secrets via environment variables; this repo's code **contains no secrets**.

### RAG required

| Variable | Description |
| --- | --- |
| `SILICONFLOW_API_KEY` | Required for embedding (bge-m3)/rerank (bge-reranker); also reused as final generation fallback |
| `NEON_SERVERLESS_URL` | Blog post vector store `rag_posts` (pgvector) connection string, required |
| `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` | Resource-store vector store `products` connection info, required |

### Generation models (preferred + fallback)

| Variable | Description |
| --- | --- |
| `SENSENOVA_API_KEYS` | **Preferred generation**; multiple keys separated by comma/newline, polled in order, only advances to next platform when all fail; fixed model `deepseek-v4-flash`, thinking mode forced off |
| `MODELSCOPE_API_KEY` | Optional fallback, ModelScope `Llama-3.3-70B` (free, direct from mainland China) |
| `ZHIPU_API_KEY` | Optional fallback, Zhipu `GLM-4.7-Flash` (permanent free, direct from mainland China) |

### Comments / R2 image host

| Variable | Description |
| --- | --- |
| `CF_KV_NAMESPACE_ID` / `CF_KV_API_TOKEN` | Cloudflare KV (**comments + short links** storage), required (otherwise comment/short-link API 503) |
| `CF_ACCOUNT_ID` | Cloudflare account ID (shared by R2 / KV, default known, can leave) |
| `UPLOAD_WORKER_URL` / `UPLOAD_WORKER_KEY` | Upload Worker (R2-bound direct write of comment images, preferred over S3 direct) |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET` / `R2_PUBLIC_URL` | S3 credentials for **article TTS audio** and **netdisk** R2 upload (comment images now use the upload Worker, but audio and netdisk still use S3 direct); if absent, audio falls to local `public/audio/`, netdisk unavailable |

### Netdisk / Short links

| Variable | Description |
| --- | --- |
| `DRIVE_TTL_HOURS` | Netdisk file lifetime (hours), default `24`; on expiry KV `expirationTtl` marks it invalid, needs R2 bucket Lifecycle rule (prefix `drive/`) to actually delete |
| `DRIVE_MAX_BYTES` | Netdisk per-file size limit (bytes), default `524288000` (500MB) |

> Short links reuse the `CF_KV_*` above; netdisk reuses `R2_*` and `CF_KV_*` above.

### Temp mail

| Variable | Description |
| --- | --- |
| `TEMP_MAIL_D1_ID` | D1 database ID |
| `CF_D1_API_TOKEN` | D1 read/write Token (with D1:Edit permission) |
| `TURNSTILE_SECRET` | Turnstile secret key (note: not the site key) |
| `TEMP_MAIL_DOMAIN` | Optional, default `qiyuanmail.cc.cd` |

### Resource store (optional)

| Variable | Description |
| --- | --- |
| `JWT_SECRET` | Resource-store user login JWT signing key (**required**, otherwise `/api/auth/*` errors) |
| `PUBLISH_KEY` | MCP publish & image-upload key (used for both `/api/publish` and `/api/images/upload`), optional |
| `PUBLIC_BASE_URL` | Public site base URL, e.g. `https://www.qiyuan.icu`, for share / SEO links |

> The resource store is an **independently deployed** project; the blog only **references** its data. Full steps in "Resource Store Setup" below.

## Resource Store Setup

> ⚠️ **The resource store and the blog are two independent deployments — do not confuse them:**
>
> - **Resource store** (netdisk resource-sharing site): a **separate EdgeOne project**, source in this repo's [`resource-site/`](./resource-site/) subdir, with its own edge function, Supabase database and (optional) frontend, deployed **separately** and bound to its own domain (e.g. `resources.qiyuan.icu`).
> - **Blog**: references resource data by sharing the same Supabase database + pointing `RESOURCES_API_PROXY` at the resource-store domain, showing, searching and fetching netdisk links in the built-in "Resources" page (`/resources`).
>
> In other words: **deploy `resource-site/` as an independent project first, then point the blog at it.** They can share one Supabase project or be independent.

### Architecture

```
                    ┌──────────────────── Resource store (independent deploy, resource-site/)
Browser               │   EdgeOne project A (domain e.g. resources.qiyuan.icu)
 ├─ Resource site ───┤     ├─ edge-functions/api/[[default]].js (auth/product/comment/image/MCP)
 │                  │     └─ Supabase (users / products / reviews / orders; product-images bucket)
 │                  └────────────────────
 │
 └─ Blog "Resources" page ──→ EdgeOne project B (blog, repo root)
        /resources        └─ /api references resource store via RESOURCES_API_PROXY, or reads products directly from same Supabase
```

### 1. Deploy the resource store (independent project)

Source in [`resource-site/`](./resource-site/), detailed docs in [`resource-site/README.md`](./resource-site/README.md).

1. **Create DB & RLS**: in Supabase SQL Editor run in order:
   - [`resource-site/database/schema.sql`](./resource-site/database/schema.sql) (tables: `users` / `products` / `reviews` / `orders` / `quark_orders`)
   - [`resource-site/database/rls_policies.sql`](./resource-site/database/rls_policies.sql) (RLS: `users` invisible to anon, products anonymously read-only when listed)
2. **Create Storage bucket**: create `product-images` bucket and make it public (or proxy via `/api/images/*`).
3. **Deploy `resource-site/` separately**: deploy that dir as an independent EdgeOne project (edge function + optional static frontend), and configure env vars in its console:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_KEY=eyJ...      # server-side key
   JWT_SECRET=***                    # resource-store login JWT signing key (required)
   ```
   > The frontend pages (`public/*.html`) are not bundled with the template; write your own or take them from the original site; if you only need the API, deploy the edge function alone.

### 2. Make the blog reference the resource store

1. **Data layer**: blog and resource store **share the same Supabase**. For RAG semantic search, run [`database/products_embedding.sql`](./database/products_embedding.sql) in Supabase to add a vector column to `products`; optionally run [`database/resource_category_i18n.sql`](./database/resource_category_i18n.sql) for multilingual categories.
2. **Point config**: set `RESOURCES_API_PROXY` on the blog side to the resource-store domain (e.g. `https://resources.qiyuan.icu`); local `npm run dev` proxies `/api` accordingly.
3. **Enable Resources page**: `resources.enabled: true` in `config/site.yaml` (default on), change `label` / `icon` / `ownerUserId` as needed.
4. **Deploy blog**: push to Git, EdgeOne Makers builds and publishes automatically.

### Verify

```bash
# verify against the resource-store domain
curl https://resources.your-domain.com/api/categories
curl "https://resources.your-domain.com/api/products?limit=2"
```

Returning JSON means the resource store works. The admin panel lets you register an account and publish products (password must contain uppercase + lowercase + digit + symbol).

### More docs

- [Resource store standalone deployment](./resource-site/README.md) and [Deployment guide](./resource-site/docs/DEPLOYMENT.md)
- [Resource store API](./resource-site/docs/API.md)
- [Resource store database schema](./resource-site/docs/DATABASE.md)
- [Blog-side resource reference config (detailed)](./docs/resources-deployment.md)
- [AI resource publishing prompt](./docs/ai-resources-publisher-prompt.md)

## Site Configuration

Main config in `config/site.yaml`, common items:

| Config | Description |
| --- | --- |
| `site.title` / `site.subtitle` | Site title and subtitle |
| `site.name` / `site.author` | Author name |
| `site.avatar` | Avatar path (currently `/img/avatar.svg`, can swap to `.jpg`/`.webp`) |
| `site.url` | Site URL, for RSS and SEO |
| `site.startYear` | Year the site was founded |
| `tempMail.domain` | Temp mail domain (default `qiyuanmail.cc.cd`) |
| `turnstileSiteKey` | Turnstile site key (public, for frontend verification widget) |
| `comment.provider` | Comment provider, default `none` (optional `custom` / `giscus` / `waline` / `twikoo`) |

To replace the avatar: put the image at `public/img/avatar.svg` (or same-name `.jpg`/`.webp`), and sync `public/favicon.ico` (favicon generated from avatar).

## How to Add a Post

1. Create a new Markdown/MDX file in `src/content/blog/`, e.g. `my-post.md`.
2. Write frontmatter at the top:

```md
---
title: My Post Title
description: One-line summary
pubDate: 2026-06-05
heroImage: ./cover.png   # optional, cover in same dir or subdir
categories:
  - Notes
tags:
  - TagOne
audio: true        # optional: true generates this post's Edge TTS Chinese audio (see "Article TTS" above)
---

Body content goes here…
```

1. Cover image rules:
   - Same dir as post: `heroImage: ./cover.png`
   - In subdir: `heroImage: ./my-post/cover.png`
2. After saving, preview locally with `npm run dev`, or build with `npm run build`.

> `pubDate` / `heroImage` auto-map to `date` / `cover`, aligning with the schema in `src/content.config.ts`.

After changing images, run `npm run generate:lqips` to update placeholder gradients.

## Directory Structure

| Path | Description |
| --- | --- |
| `config/site.yaml` | Site main config |
| `src/pages/` | Page routes (incl. `[lang]/` multilingual mirror) |
| `src/content/blog/` | Post collection (Markdown/MDX) |
| `src/components/` | UI components (incl. `tempmail/`, `chat/`) |
| `src/layouts/` | Page layouts |
| `edge-functions/api/[[default]].js` | EdgeOne edge function: RAG chat / temp mail / comments / upload / MCP / stats |
| `cloud-functions/` | Makers cloud functions (blog image-upload etc.) |
| `cloudflare/` | Temp-mail receiving Worker, D1 schema, wrangler config (deploy to Cloudflare yourself) |
| `public/` | Static assets (favicon, images, fonts, etc.) |
| `scripts/generate-audio.mjs` | Article TTS audio generation (Edge TTS → R2/CDN, outputs `src/assets/audio-manifest.json`) |
| `src/assets/audio-manifest.json` | Audio manifest: `slug → { url, voice, chars, bytes, generatedAt }`, `url` has `?v=<hash>` cache-buster |

## Deployment

After pushing to Git, **EdgeOne Makers** auto-builds (`npm run build`) and publishes; the edge function deploys with the repo. **Before deploying, fill in the corresponding env vars in the EdgeOne console** (especially `SILICONFLOW_API_KEY` / `NEON_SERVERLESS_URL` / `SUPABASE_*` / `SENSENOVA_API_KEYS` / `CF_KV_*`).

Temp mail additionally requires on the **Cloudflare console**: deploy the receiving Worker under `cloudflare/`, create D1 tables, configure Email Routing catch-all → Worker, configure Turnstile. See comments inside each file.

## License

This project is open-sourced under the **MIT License** (see [LICENSE](./LICENSE)). You are free to fork, modify, and deploy it as your own blog, keeping the copyright and license notice; commercial use is also allowed, at your own risk.
