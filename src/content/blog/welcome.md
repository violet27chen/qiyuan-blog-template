---
title: 欢迎使用这个博客模板
description: 这是一个基于 Astro 5 + EdgeOne Pages 的极简技术博客模板，开箱即用，支持文章朗读、站内 AI 助手、评论、资源站等扩展功能。
pubDate: "Jul 12 2026 00:00"
categories: [随笔]
tags: [博客, Astro, 模板]
audio: false
---

这是用 **Astro 5 + EdgeOne Pages** 搭建的博客模板。删除本文件、放入你自己的 `.md` / `.mdx` 文章即可。

## 快速开始

```bash
npm install      # 安装依赖
npm run dev      # 本地开发 (http://localhost:4321)
npm run build    # 构建静态站点到 dist/
```

## 写一篇文章

在 `src/content/blog/` 下新建 `<slug>.md`，frontmatter 示例：

```yaml
---
title: 我的第一篇文章
description: 一句话简介，用于 SEO 与社交分享卡片
pubDate: "Jul 12 2026 12:00"
categories: [笔记]
tags: [Astro, 前端]
audio: true   # 设为 true 会用 Edge TTS 预生成朗读音频（需配置 R2 与 SILICONFLOW_API_KEY）
---
```

## 内置能力

- **多语言**：默认 `zh`，可启用 `en` / `ja`（见 `config/site.yaml` 的 `i18n`）。
- **文章朗读**：`audio: true` 的文章自动生成 mp3（见 README「文章朗读」一节）。
- **站内 AI 助手**：基于 RAG 的问答（需 Neon + 硅基流动 + 生成模型）。
- **评论 / 临时邮箱 / 网盘 / 短链**：均为可选模块，在 `config/site.yaml` 中开关。
- **数学公式、Mermaid、代码高亮、提醒块** 等富文本增强。

> 删除 `config/site.yaml` 里的个人信息，改成你自己的站名、域名与社交链接，然后部署即可。
