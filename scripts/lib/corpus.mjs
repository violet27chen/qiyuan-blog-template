/**
 * scripts/lib/corpus.mjs
 * 共享逻辑：从 Markdown 源(src/content/blog)生成「干净文章语料」。
 *
 * 被两处复用：
 *   - scripts/export-corpus.mjs        (手动: npm run export:corpus -> corpus.json)
 *   - integrations/index-rag-neon.mjs  (构建时: 读取文章并嵌入写 Neon 向量库)
 *
 * 设计目标(针对 RAG 检索质量差的根因)：
 *   - 直接读 Markdown 源，正文不含导航/页脚/标签云噪声
 *   - 封面图不写进语料，避免 "https://qiyuan.icu/[object Object]" 这类错误 URL
 *   - 跳过 draft / 加密(password) 文章
 *   - 每个 post 附 zh/en/ja 规范 URL(alternates)，AI 引用拿到的 URL 100% 真实
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import YAML from 'yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..', '..'); // scripts/lib -> repo root

export function loadSiteConfig() {
  const cfgPath = path.join(root, 'config', 'site.yaml');
  const raw = fs.readFileSync(cfgPath, 'utf8');
  const cfg = YAML.parse(raw);
  const siteUrl = (cfg?.site?.url || 'https://qiyuan.icu').replace(/\/+$/, '');
  const i18n = cfg?.i18n || {};
  const defaultLocale = i18n.defaultLocale || 'zh';
  const locales = (i18n.locales || [{ code: 'zh' }]).map((l) => (typeof l === 'string' ? l : l.code));
  return { siteUrl, defaultLocale, locales };
}

export function inlineClean(s) {
  return s
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1') // 图片 → alt 文本
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // 链接 → 文本
    .replace(/`([^`]+)`/g, '$1') // 行内代码 → 文本
    .replace(/(\*\*|__)(.*?)\1/g, '$2') // 粗体
    .replace(/(\*|_)(.*?)\1/g, '$2') // 斜体
    .replace(/~~(.*?)~~/g, '$1') // 删除线
    .replace(/<[^>]+>/g, '') // 残留 HTML 标签
    .replace(/\s+/g, ' ')
    .trim();
}

export function cleanMarkdown(md) {
  md = md.replace(/<!--[\s\S]*?-->/g, ''); // HTML 注释
  md = md.replace(/\{%[\s\S]*?%\}/g, ''); // Hexo/Shoka 标签 {% ... %}

  const lines = md.split(/\r?\n/);
  const out = [];
  let inFence = false;
  let fenceChar = '';

  for (const raw of lines) {
    const fenceMatch = raw.match(/^\s*(```|~~~)/);
    if (fenceMatch) {
      if (!inFence) {
        inFence = true;
        fenceChar = fenceMatch[1][0];
        continue;
      }
      if (raw.trim().startsWith(fenceChar.repeat(3))) {
        inFence = false;
        continue;
      }
    }
    if (inFence) {
      out.push(raw);
      continue;
    }
    const trimmed = raw.trim();
    if (trimmed === '') {
      out.push('');
      continue;
    }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) continue;
    let m;
    if ((m = trimmed.match(/^#{1,6}\s+(.*)$/))) {
      out.push(inlineClean(m[1]));
      continue;
    }
    if ((m = trimmed.match(/^>\s?(.*)$/))) {
      out.push(inlineClean(m[1]));
      continue;
    }
    if (/^\|?[\s:|-]+\|?$/.test(trimmed) && trimmed.includes('-')) continue;
    if (trimmed.includes('|')) {
      const row = trimmed
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((c) => inlineClean(c))
        .join(' | ');
      if (row.trim()) out.push(row);
      continue;
    }
    if ((m = trimmed.match(/^([-*+]|\d+\.)\s+(.*)$/))) {
      out.push('• ' + inlineClean(m[2]));
      continue;
    }
    out.push(inlineClean(trimmed));
  }

  const collapsed = [];
  let lastBlank = false;
  for (const l of out) {
    if (l === '') {
      if (lastBlank) continue;
      lastBlank = true;
    } else {
      lastBlank = false;
    }
    collapsed.push(l);
  }
  return collapsed.join('\n').trim();
}

export function flattenCategories(categories) {
  if (!categories) return [];
  const result = [];
  for (const c of categories) {
    if (Array.isArray(c)) result.push(...c.map((x) => String(x).trim()).filter(Boolean));
    else if (typeof c === 'string') result.push(c.trim());
  }
  return [...new Set(result)];
}

/**
 * 读取所有博客文章，返回结构化文档数组。
 * @param {{ blogDir?: string }} opts
 */
export function buildDocuments(opts = {}) {
  const { siteUrl, defaultLocale, locales } = loadSiteConfig();
  const dir = opts.blogDir || path.join(root, 'src', 'content', 'blog');
  const files = fs.readdirSync(dir).filter((f) => /\.(md|mdx)$/i.test(f));
  const documents = [];

  for (const file of files) {
    const slug = file.replace(/\.(md|mdx)$/i, '');
    const raw = fs.readFileSync(path.join(dir, file), 'utf8');
    const { data, content } = matter(raw);

    if (data.draft === true) continue; // 跳过草稿
    if (data.password) continue; // 跳过加密文章
    if (!data.title) continue;

    const body = cleanMarkdown(content);
    const tags = Array.isArray(data.tags) ? data.tags.map(String) : [];
    const categories = flattenCategories(data.categories);

    const alternates = {};
    for (const loc of locales) {
      const prefix = loc === defaultLocale ? '' : `/${loc}`;
      alternates[loc] = `${siteUrl}${prefix}/post/${slug}/`;
    }

    documents.push({
      id: slug,
      title: String(data.title),
      description: data.description ? String(data.description) : '',
      lang: defaultLocale,
      locales,
      tags,
      categories,
      date: data.date ? new Date(data.date).toISOString().slice(0, 10) : '',
      updated: data.updated ? new Date(data.updated).toISOString().slice(0, 10) : '',
      url: alternates[defaultLocale],
      alternates,
      cover: null, // 故意留空：避免错误图片 URL
      body,
      wordCount: body.replace(/\s+/g, '').length,
    });
  }

  documents.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return documents;
}
