/**
 * export-corpus.mjs
 * 一次性导出整站干净语料: scripts/output/corpus.json + corpus.txt
 * 运行: npm run export:corpus
 *
 * 解析/清洗逻辑见 scripts/lib/corpus.mjs(与构建时集成共用)。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDocuments, loadSiteConfig } from './lib/corpus.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'scripts', 'output');

function main() {
  const { siteUrl, defaultLocale, locales } = loadSiteConfig();
  const documents = buildDocuments();

  fs.mkdirSync(outDir, { recursive: true });

  const jsonPayload = {
    meta: {
      generatedAt: new Date().toISOString(),
      source: 'src/content/blog (Markdown source, not crawled HTML)',
      site: siteUrl,
      defaultLocale,
      locales,
      count: documents.length,
    },
    documents,
  };

  const jsonPath = path.join(outDir, 'corpus.json');
  fs.writeFileSync(jsonPath, JSON.stringify(jsonPayload, null, 2), 'utf8');

  const txt = documents
    .map((d) => {
      const head = [`# ${d.title}`, `URL: ${d.url}`];
      if (d.tags.length) head.push(`Tags: ${d.tags.join(', ')}`);
      if (d.categories.length) head.push(`Categories: ${d.categories.join(' / ')}`);
      if (d.date) head.push(`Date: ${d.date}`);
      return `${head.join('\n')}\n\n${d.body}\n`;
    })
    .join('\n================================================================================\n\n');
  const txtPath = path.join(outDir, 'corpus.txt');
  fs.writeFileSync(txtPath, txt, 'utf8');

  console.log(`[export-corpus] 完成`);
  console.log(`  文章数 : ${documents.length}`);
  console.log(`  JSON   : scripts/output/corpus.json (${fs.statSync(jsonPath).size} bytes)`);
  console.log(`  TXT    : scripts/output/corpus.txt (${fs.statSync(txtPath).size} bytes)`);
}

main();
