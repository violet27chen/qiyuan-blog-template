/**
 * scripts/generate-audio.mjs
 * 文章朗读音频预生成：npm run generate:audio
 *
 * 架构：Markdown(audio:true) → Edge TTS 生成 mp3 → Cloudflare R2（audio/ 前缀）→ CDN(r2.qiyuan.icu) → 播放器
 * 无 R2 凭据时降级：写入 public/audio/<slug>.mp3（随站点部署，走 EdgeOne CDN）。
 * 产出清单：src/assets/audio-manifest.json（slug → { url, voice, chars, bytes, generatedAt }），文章页据此决定是否显示播放器。
 *   url 末尾自动追加缓存破坏参数 `?v=<mp3 内容 sha256 前 12 位>`：R2/EdgeOne 对未知 query 按同一对象返回，但浏览器/CDN 以完整 URL 作缓存键，音频更新后 URL 必变、强制重新拉取（R2 默认 Cache-Control: max-age=604800）。
 *
 * 增量：内容 + 音色 hash 存 .cache/audio-cache.json，未变则跳过；--force 全量重生成。
 *
 * 环境变量（终端导出或写入 .env，脚本会自动读取 .env）：
 *   R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET  R2 S3 凭据（缺省则落本地 public/audio/）
 *   R2_PUBLIC_URL   R2 公开域，默认 https://r2.qiyuan.icu
 *   AUDIO_VOICE     默认朗读音色，默认 zh-CN-XiaoxiaoNeural（可被文章 frontmatter audioVoice 覆盖）
 *   AUDIO_STORAGE   'r2' | 'local'，默认自动（有 R2 凭据用 r2，否则 local）
 *
 * 用法：
 *   npm run generate:audio            # 增量生成
 *   npm run generate:audio -- --force # 全量重生成
 *   npm run generate:audio -- --local # 强制落本地 public/audio/
 */

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import fssync from 'node:fs';
import path from 'node:path';
import { glob } from 'glob';
import matter from 'gray-matter';
import yaml from 'js-yaml';
import { remark } from 'remark';
import strip from 'strip-markdown';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

// 读取非默认语言的 glob（翻译版与原文共享 slug，需跳过），逻辑同 src/scripts/locale-filter.ts
function getNonDefaultLocaleGlobs() {
  try {
    const cfg = yaml.load(fssync.readFileSync('config/site.yaml', 'utf-8'));
    const defaultLocale = cfg?.i18n?.defaultLocale ?? 'zh';
    const codes = cfg?.i18n?.locales?.map((l) => l.code) ?? [];
    return codes.filter((c) => c !== defaultLocale).map((c) => `src/content/blog/${c}/**`);
  } catch {
    return [];
  }
}

// --------- 极简 .env 加载（仅补齐 process.env 中缺失的键，不覆盖已有） ---------
function loadDotEnv(file = '.env') {
  try {
    const raw = fssync.readFileSync(file, 'utf-8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const key = m[1];
      let val = m[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  } catch {
    /* 无 .env 时忽略 */
  }
}
loadDotEnv();

// --------- 配置 ---------
const CONTENT_GLOB = 'src/content/blog/**/*.md';
const NON_DEFAULT_LOCALE_GLOBS = getNonDefaultLocaleGlobs();
const CACHE_FILE = '.cache/audio-cache.json';
const MANIFEST_FILE = 'src/assets/audio-manifest.json';
const LOCAL_OUT_DIR = 'public/audio';
const R2_PREFIX = 'audio/';
const CACHE_VERSION = '1';
const DEFAULT_VOICE = process.env.AUDIO_VOICE || 'zh-CN-XiaoxiaoNeural';
const OUTPUT = OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3; // 24kHz 48kbit 单声道 mp3，语音够用且体积小
const CHUNK_SIZE = 1800; // 单次 TTS 请求文本上限（字符），避免 Read Aloud API 超长失败

const R2 = {
  accountId: process.env.R2_ACCOUNT_ID || '',
  accessKey: process.env.R2_ACCESS_KEY_ID || '',
  secretKey: process.env.R2_SECRET_ACCESS_KEY || '',
  bucket: process.env.R2_BUCKET || '',
  publicUrl: (process.env.R2_PUBLIC_URL || 'https://r2.qiyuan.icu').replace(/\/$/, ''),
};

// --------- CLI ---------
const argv = process.argv.slice(2);
const FORCE = argv.includes('--force');
const FORCE_LOCAL = argv.includes('--local') || process.env.AUDIO_STORAGE === 'local';
const hasR2 = R2.accountId && R2.accessKey && R2.secretKey && R2.bucket;
const USE_R2 = !FORCE_LOCAL && hasR2;

// --------- 工具 ---------
function computeHash(s) {
  return crypto.createHash('md5').update(s).digest('hex');
}

function extractSlug(filePath, link) {
  if (link) return String(link).toLowerCase();
  return filePath
    .replace(/\\/g, '/')
    .replace(/^src\/content\/blog\//, '')
    .replace(/\.md$/, '')
    .toLowerCase();
}

async function getPlainText(markdown) {
  const result = await remark().use(strip).process(markdown);
  return String(result)
    .replace(/^import\s+.*$/gm, '')
    .replace(/^export\s+.*$/gm, '')
    .replace(/^\|.*\|$/gm, '') // 去表格
    .replace(/^:::.*/gm, '') // 去 directive
    .replace(/https?:\/\/\S+/g, '') // 去裸链接
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

// 按句子边界切块，单块不超过 CHUNK_SIZE
function chunkText(text, size = CHUNK_SIZE) {
  const sentences = text.split(/(?<=[。！？.!?\n])/);
  const chunks = [];
  let cur = '';
  for (const s of sentences) {
    if ((cur + s).length > size && cur) {
      chunks.push(cur);
      cur = '';
    }
    // 单句仍超长则硬切
    if (s.length > size) {
      if (cur) {
        chunks.push(cur);
        cur = '';
      }
      for (let i = 0; i < s.length; i += size) chunks.push(s.slice(i, i + size));
    } else {
      cur += s;
    }
  }
  if (cur.trim()) chunks.push(cur);
  return chunks.filter((c) => c.trim());
}

// --------- Edge TTS ---------
// SSML 要求转义 XML 特殊字符；msedge-tts 不会自动转义，裸 & < > 会让 Microsoft 服务端 SSML 解析失败、流提前中断。
function escapeXml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
async function synthesizeChunk(voice, text) {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(voice, OUTPUT);
  const { audioStream } = tts.toStream(escapeXml(text));
  return await new Promise((resolve, reject) => {
    const parts = [];
    audioStream.on('data', (d) => parts.push(d));
    audioStream.on('close', () => resolve(Buffer.concat(parts)));
    audioStream.on('error', reject);
  });
}

async function synthesize(voice, text) {
  const chunks = chunkText(text);
  const buffers = [];
  for (let i = 0; i < chunks.length; i++) {
    process.stdout.write(`\r    TTS 合成分块 ${i + 1}/${chunks.length}...   `);
    let lastErr;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        buffers.push(await synthesizeChunk(voice, chunks[i]));
        lastErr = null;
        break;
      } catch (e) {
        lastErr = e;
        await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
      }
    }
    if (lastErr) throw lastErr;
  }
  process.stdout.write('\n');
  return Buffer.concat(buffers); // 多段 mp3 直接拼接，浏览器可连续播放
}

// --------- R2 上传（SigV4 presigned PUT，node:crypto 实现） ---------
function hmac(key, data) {
  return crypto.createHmac('sha256', key).update(data, 'utf8').digest();
}
function sha256Hex(data) {
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
}
function presignR2Put({ objectKey, expires = 600 }) {
  const host = `${R2.accountId}.r2.cloudflarestorage.com`;
  const region = 'auto';
  const service = 's3';
  const now = new Date();
  const amzDate = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const dateStamp = amzDate.slice(0, 8);
  const credential = `${R2.accessKey}/${dateStamp}/${region}/${service}/aws4_request`;
  const qp = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': credential,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(expires),
    'X-Amz-SignedHeaders': 'host',
  };
  const enc = (s) => encodeURIComponent(s);
  const canonicalQuery = Object.keys(qp)
    .sort()
    .map((k) => `${enc(k)}=${enc(qp[k])}`)
    .join('&');
  const canonicalUri = `/${enc(R2.bucket)}/${objectKey.split('/').map(enc).join('/')}`;
  const canonicalRequest = `PUT\n${canonicalUri}\n${canonicalQuery}\nhost:${host}\n\nhost\nUNSIGNED-PAYLOAD`;
  const scope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${scope}\n${sha256Hex(canonicalRequest)}`;
  const kDate = hmac(`AWS4${R2.secretKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, 'aws4_request');
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign, 'utf8').digest('hex');
  return `https://${host}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

async function uploadToR2(slug, buffer) {
  const objectKey = `${R2_PREFIX}${slug}.mp3`;
  const uploadUrl = presignR2Put({ objectKey });
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'audio/mpeg' },
    body: buffer,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`R2 上传失败 ${res.status}: ${body.slice(0, 200)}`);
  }
  return `${R2.publicUrl}/${objectKey}`;
}

async function saveLocal(slug, buffer) {
  await fs.mkdir(LOCAL_OUT_DIR, { recursive: true });
  const safe = slug.replace(/\//g, '__'); // 本地文件名扁平化
  await fs.writeFile(path.join(LOCAL_OUT_DIR, `${safe}.mp3`), buffer);
  return `/audio/${safe}.mp3`;
}

// 给音频 URL 加基于 mp3 内容哈希的缓存破坏参数 ?v=<hash>。
// R2/EdgeOne 对未知 query 参数按同一对象返回，但浏览器/CDN 以完整 URL 作缓存键，
// 故音频内容一变、URL 即变，强制重新拉取，避免长期缓存旧 mp3（默认 Cache-Control=7d）。
function withCacheBust(url, buffer) {
  const v = crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 12);
  return `${url}?v=${v}`;
}

// --------- 缓存 / 清单 ---------
async function loadJson(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf-8'));
  } catch {
    return fallback;
  }
}
async function saveJson(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2));
}

// --------- 主流程 ---------
async function main() {
  const t0 = Date.now();
  console.log('=== 文章朗读音频生成 (Edge TTS) ===');
  console.log(`存储：${USE_R2 ? `R2 → ${R2.publicUrl}/${R2_PREFIX}` : `本地 → ${LOCAL_OUT_DIR}/`}`);
  console.log(`音色：${DEFAULT_VOICE}${FORCE ? '  [--force 全量]' : ''}\n`);

  if (!USE_R2 && hasR2 && FORCE_LOCAL) console.log('（检测到 --local / AUDIO_STORAGE=local，忽略 R2 凭据）\n');
  if (!hasR2 && !FORCE_LOCAL) console.log('（未配置 R2 凭据，自动落本地 public/audio/）\n');

  const cache = FORCE ? { version: CACHE_VERSION, entries: {} } : await loadJson(CACHE_FILE, { version: CACHE_VERSION, entries: {} });
  if (cache.version !== CACHE_VERSION) cache.entries = {};
  const oldManifest = await loadJson(MANIFEST_FILE, {});

  const files = await glob(CONTENT_GLOB, { ignore: NON_DEFAULT_LOCALE_GLOBS });
  const manifest = {};
  let generated = 0;
  let cached = 0;
  let skipped = 0;
  let errors = 0;

  for (const file of files) {
    const raw = await fs.readFile(file, 'utf-8');
    const { data: fm, content: body } = matter(raw);
    if (fm.audio !== true) continue;
    if (fm.draft === true) {
      skipped++;
      continue;
    }
    // 加密文章不生成朗读音频（正文受 password 保护，页面也不会显示播放器）
    if (fm.password) {
      skipped++;
      continue;
    }

    const slug = extractSlug(file, fm.link);
    const voice = (fm.audioVoice && String(fm.audioVoice)) || DEFAULT_VOICE;
    const text = await getPlainText(body);
    if (!text) {
      console.log(`  跳过（无正文文本）：${slug}`);
      skipped++;
      continue;
    }

    const storageTag = USE_R2 ? 'r2' : 'local';
    const hash = computeHash(`${CACHE_VERSION}|${voice}|${storageTag}|${text}`);
    const prev = cache.entries[slug];

    if (prev && prev.hash === hash && oldManifest[slug]?.url) {
      manifest[slug] = oldManifest[slug];
      cached++;
      console.log(`  缓存命中：${slug}`);
      continue;
    }

    try {
      console.log(`  生成中：${slug}（${text.length} 字，音色 ${voice}）`);
      const buffer = await synthesize(voice, text);
      const url = USE_R2 ? await uploadToR2(slug, buffer) : await saveLocal(slug, buffer);
      const entry = { url: withCacheBust(url, buffer), voice, chars: text.length, bytes: buffer.length, generatedAt: new Date().toISOString() };
      manifest[slug] = entry;
      cache.entries[slug] = { hash, ...entry };
      generated++;
      console.log(`    完成 → ${url}（${(buffer.length / 1024).toFixed(0)} KB）`);
    } catch (e) {
      errors++;
      console.error(`    失败：${slug} → ${e?.message || e}`);
      if (oldManifest[slug]?.url) manifest[slug] = oldManifest[slug]; // 保留旧音频
    }
  }

  await saveJson(MANIFEST_FILE, manifest);
  await saveJson(CACHE_FILE, cache);

  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n完成：新生成 ${generated}，缓存 ${cached}，跳过 ${skipped}，失败 ${errors}（${secs}s）`);
  console.log(`清单：${MANIFEST_FILE}（共 ${Object.keys(manifest).length} 篇有音频）`);
  if (errors) process.exitCode = 1;
}

main().catch((e) => {
  console.error('\n致命错误：', e);
  process.exitCode = 1;
});
