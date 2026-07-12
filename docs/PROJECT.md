# 祈愿博客（qiyuan.icu）项目文档

> **仓库定位：本仓库是一个 GitHub 模板（Use this template）。** Fork 后修改 `config/site.yaml`、填充文章、配置环境变量即可变成你自己的博客。
> 请勿在文档、配置或提交信息中泄露私密信息（密钥、密码、加密文章口令等）。

## 项目概述

祈愿博客是一个基于 **Astro 5** 的纯静态技术博客，采用 [Koharu](https://github.com/koharu-org/koharu) 主题风格（兼容大量 Shoka/Hexo 语法）。内容以 Markdown/MDX 编写，构建后生成纯静态 HTML；部署在服务器本地 Nginx 上，EdgeOne 作为 CDN 加速。

- **地址**: https://www.qiyuan.icu（示例域名，请替换为你自己的）
- **仓库**: https://github.com/your-username/your-blog
- **部署方式**: 本地 build → 部署到 EdgeOne Makers（或 Nginx / 任意静态托管）

## 技术栈

| 组件 | 版本/说明 |
|------|-----------|
| Astro | 5.16.x（静态站点生成器） |
| React | 19.x（`@astrojs/react`，岛屿式交互） |
| Tailwind CSS | 4.x（`@tailwindcss/vite`） |
| UI | Radix UI、shadcn 组件、class-variance-authority、motion 动画、Three.js（飘雪） |
| 内容 | Markdown/MDX + remark/rehype 自定义插件链 |
| 代码高亮 | Shiki（`shiki`，含自定义 meta transformer） |
| 数学公式 | remark-math + rehype-katex（KaTeX） |
| 搜索 | Pagefind 1.5.x（客户端全文搜索，构建时索引） |
| 图片 | Sharp 0.34.x + LQIP 占位渐变生成 |
| AI 能力 | `@huggingface/transformers`（相似文章）、`@xsai/generate-text`（AI 摘要） |
| 统计 | Umami（`@yeskunall/astro-umami`，可选） |
| 工具链 | Biome（lint/format）、Knip、Husky、lint-staged、git-cliff（CHANGELOG） |
| 适配器 | Netlify / Vercel / Node（多适配器可选） |
| Node.js | >= 22.12.0 |

## 项目结构

```
qiyuan/
├── astro.config.mjs        # Astro 配置（插件链、i18n、条件打包、适配器）
├── package.json
├── config/
│   └── site.yaml           # 全站配置中枢（623 行，几乎所有功能均可在此开关）
├── src/
│   ├── components/         # UI 组件（评论、Bangumi、友链、BGM 播放器、公告等）
│   ├── content/
│   │   └── blog/           # 博客文章（Markdown/MDX + 封面图）
│   │       ├── *.md        # 文章文件
│   │       └── <slug>/     # 文章附件目录（封面图等）
│   ├── content.config.ts   # 内容集合 schema
│   ├── layouts/            # 页面布局
│   ├── lib/                # 核心逻辑（内容处理、分类/标签、加密内容、Markdown 插件等）
│   ├── pages/              # 路由，采用 [lang]/ 动态语言前缀（i18n: zh/en/ja）
│   └── scripts/            # 生成脚本（LQIP、AI 摘要、相似文章等）
├── edge-functions/         # 资源站后端 API（EdgeOne 部署）
├── cloud-functions/        # 云函数（图片上传等）
├── database/               # 资源站 SQL（schema、RLS 策略、分类 i18n）
├── scripts/                # 构建/同步脚本
├── docs/                   # 项目文档与部署说明
├── public/                 # 静态资源（直接复制到输出目录）
└── dist/                   # 构建输出（rsync 到 Nginx）
```

> 全站配置集中在 `config/site.yaml`，而非旧文档中提到的 `consts.ts`。修改配置后需重新构建。

## 内容管理

### 写新文章

在 `src/content/blog/` 下创建 Markdown/MDX 文件：

```markdown
---
title: 文章标题
description: 一句话摘要（用于 SEO 和首页摘要）
pubDate: 2026-06-05
heroImage: ./cover.png   # 可选，封面放同级或子目录
categories:
  - 笔记
tags:
  - 标签一
---

正文内容，支持标准 Markdown、MDX 以及 Shoka 兼容语法。
```

**Frontmatter 字段说明：**

| 字段 | 必填 | 说明 |
|------|------|------|
| title | 是 | 文章标题 |
| description | 否 | 文章描述（SEO 用） |
| pubDate | 是 | 发布日期，会自动映射为 `date`（与 `src/content.config.ts` schema 对齐） |
| heroImage | 否 | 封面图路径，会自动映射为 `cover` |
| categories / tags | 否 | 分类与标签 |

### 封面图

1. 与文章同目录：`heroImage: ./cover.png`
2. 或放在子目录：`heroImage: ./my-post/cover.png`
3. 修改图片后建议运行 `npm run generate:lqips` 更新占位渐变

### 内容增强能力

- Shoka 兼容语法：提醒块 `:::`、标签卡 `;;;`、折叠块 `+++`、高亮 `==`、下标 `~`、上标 `^`、注音 `{文字^注音}`、隐藏文字 `!!...!!`
- KaTeX 数学公式、代码块增强（行号/复制/全屏）、链接卡片与推文嵌入
- **加密文章 / 加密内容块**、交互式测验 quiz
- 以上能力均可在 `config/site.yaml` 的 `content:` 段独立开关

## 国际化（i18n）

- 路由采用 `[lang]/` 动态前缀，支持 zh / en / ja 三语言
- 默认语言 `zh`（URL 不带前缀），配置见 `config/site.yaml` 的 `i18n:` 段

## 构建与部署

### 本地开发

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # 构建到 dist/（含 Pagefind 索引）
npm run preview  # 预览构建结果
```

### 常用生成脚本

```bash
npm run generate:lqips        # 生成图片 LQIP 占位渐变
npm run generate:summaries    # 生成 AI 摘要
npm run generate:similarities # 生成相似文章
npm run generate:all          # 依次执行以上全部
```

### 发布流程

```bash
cd /home/ubuntu/qiyuan
npm run build                                     # 构建 + Pagefind 索引
sudo rsync -av --delete dist/ /var/www/qiyuan/    # 部署到 Nginx
git add -A && git commit -m "xxx" && git push     # 推送到私有 GitHub 仓库（仅备份）
```

**注意：push GitHub 只是私有备份，不对外公开，也不触发部署。部署是本地 rsync 到 Nginx。**

### 部署到服务器

```bash
sudo rsync -av --delete /home/ubuntu/qiyuan/dist/ /var/www/qiyuan/
```

静态文件由 Nginx 直接提供服务，EdgeOne 作为 CDN 加速。亦可用 Docker：`docker compose up -d --build`。

## SEO 配置

### 站点地图

- `@astrojs/sitemap` 自动生成 `sitemap-index.xml`

### RSS

- 自动生成 `rss.xml`，包含所有已发布文章
- URL: `https://www.qiyuan.icu/rss.xml`

### 全文搜索

- 使用 Pagefind（客户端搜索），构建时自动索引到 `dist/_pagefind/`
- 无需服务端，完全静态

### robots.txt

- 由 `astro-robots-txt` 生成，策略配置见 `config/site.yaml` 的 `seo.robots` 段

## 资源站（网盘资源分享站）

- 独立后端：`edge-functions/api/[[default]].js`（EdgeOne 部署）
- 数据库结构与 RLS 策略见 `database/`，部署说明见 `docs/resources-deployment.md`
- 开关配置见 `config/site.yaml` 的 `resources:` 段

## 自定义域名

域名通过 `astro.config.mjs` 中的 `site` 字段配置（读取自 `config/site.yaml` 的 `site.url`）：

```js
export default defineConfig({
  site: 'https://www.qiyuan.icu',
  // ...
});
```

页脚和关于页面的域名使用 `location.hostname` 动态显示，无需硬编码。

## 常见问题

### 构建失败

确保 Node.js >= 22.12.0：
```bash
node --version
```

### 搜索不工作

Pagefind 在 `npm run build` 时自动构建索引，确认 `dist/_pagefind/` 目录存在。

### EdgeOne CDN 缓存

更新文件后 `/` 可能返回旧内容，用 `/index.html?v=xxx` 强制刷新。重启 Nginx 不一定立刻刷新 CDN 缓存。

### 添加新文章后没有显示

1. 确认 frontmatter 格式正确
2. 重新 `npm run build`
3. rsync 到 `/var/www/qiyuan/`
