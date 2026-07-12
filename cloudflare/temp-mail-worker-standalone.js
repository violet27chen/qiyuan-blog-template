// 临时邮箱收信 Worker（Cloudflare）— 零依赖版
// 适用：直接粘贴到 Cloudflare 控制台 Worker 网页编辑器（无法 npm install 时）。
// 职责：接收 Email Routing catch-all（*@qiyuanmail.cc.cd）转发的邮件，自解析 MIME 后写入 D1。
// 不 import 任何 npm 包 —— 内置精简 MIME 解析（headers/RFC2047 主题/QP/base64/multipart）。
// 绑定：D1 数据库 binding = DB（在控制台 Settings → Bindings 里加，或 wrangler.toml）。

const RETENTION_MS = 24 * 60 * 60 * 1000; // 24 小时保留

export default {
  // HTTP 访问该域名（qiyuanmail.cc.cd）= 只收信，不提供网页。
  // 没有 fetch 导出时，Cloudflare 会把页面请求当成“脚本异常”报 1101，
  // 所以这里必须给一个不会抛错的 fetch 处理（返回说明页）。
  async fetch(request, env) {
    const url = new URL(request.url);
    // 健康检查 / 便于确认 Worker 在线
    if (url.pathname === '/health' || url.pathname === '/_health') {
      return new Response('ok', { status: 200, headers: { 'content-type': 'text/plain' } });
    }
    const html = `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>qiyuanmail.cc.cd</title>
<style>
  body{margin:0;font-family:system-ui,-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;
       background:#0b0b0d;color:#e7e7e9;display:flex;min-height:100vh;align-items:center;justify-content:center}
  .card{max-width:520px;padding:40px 32px;border:1px solid #26262b;border-radius:16px;background:#141417;text-align:center}
  h1{font-size:20px;margin:0 0 12px}
  p{color:#a1a1aa;line-height:1.7;margin:8px 0;font-size:14px}
  code{background:#26262b;padding:2px 6px;border-radius:6px;color:#34d399}
</style>
</head>
<body>
  <div class="card">
    <h1>qiyuanmail.cc.cd · 临时邮箱收信域</h1>
    <p>这是一个<strong>专门接收邮件</strong>的域名，不提供网页界面。</p>
    <p>请在主站 <code>qiyuan.icu/temp-mail</code> 生成随机地址并查看收件箱。</p>
    <p>发往 <code>任意名@qiyuanmail.cc.cd</code> 的邮件会被自动接收并在主站展示。</p>
  </div>
</body>
</html>`;
    return new Response(html, {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
    });
  },

  async email(message, env) {
    const to = String(message.to || '').toLowerCase().trim();
    const now = Date.now();
    const cutoff = now - RETENTION_MS;

    // D1 未绑定 / 缺失时，不要抛异常（避免污染 Email Routing），仅记录
    if (!env || !env.DB) {
      console.error('[temp-mail] D1 binding (DB) missing — 请在控制台 Bindings 绑定 D1 数据库');
      return;
    }

    // 清理过期（先删邮件再删地址，避免孤儿行）
    try {
      await env.DB.prepare(
        'DELETE FROM temp_messages WHERE addr IN (SELECT addr FROM temp_addresses WHERE created_at < ?)'
      ).bind(cutoff).run();
      await env.DB.prepare('DELETE FROM temp_addresses WHERE created_at < ?').bind(cutoff).run();
    } catch (e) {
      console.error('[temp-mail] cleanup failed:', e && e.message);
    }

    // 记录/更新收件地址（供 24h 清理用；INSERT OR IGNORE 保留首次创建时间）
    try {
      await env.DB.prepare(
        'INSERT OR IGNORE INTO temp_addresses (addr, created_at) VALUES (?, ?)'
      ).bind(to, now).run();
    } catch (e) {
      console.error('[temp-mail] address upsert failed:', e && e.message);
    }

    // 读取原始邮件并解析
    let parsed = { from: message.from || '', subject: '(无主题)', text: '', html: null };
    try {
      const raw = await new Response(message.raw).text();
      parsed = parseEmail(raw);
      if (!parsed.from) parsed.from = message.from || '';
    } catch (e) {
      console.error('[temp-mail] parse failed:', e && e.message);
    }

    try {
      await env.DB.prepare(
        `INSERT OR IGNORE INTO temp_messages
         (id, addr, from_addr, subject, body_text, body_html, received_at, raw_size)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        crypto.randomUUID(),
        to,
        parsed.from || '',
        parsed.subject || '(无主题)',
        parsed.text || '',
        parsed.html || null,
        now,
        message.rawSize || 0
      ).run();
    } catch (e) {
      console.error('[temp-mail] insert failed:', e && e.message);
    }
  },
};

// ───────────────────────── 内置 MIME 解析 ─────────────────────────

function parseEmail(raw) {
  const { headers, body } = splitHeadersBody(raw);
  const from = extractFrom(getHeader(headers, 'from'));
  const subject = decodeRFC2047(getHeader(headers, 'subject') || '');
  const ctype = getHeader(headers, 'content-type') || 'text/plain';
  const out = { from, subject, text: '', html: null };
  collectParts(headers, body, out);
  return out;
}

function splitHeadersBody(raw) {
  const norm = raw.replace(/\r\n/g, '\n');
  const idx = norm.indexOf('\n\n');
  if (idx === -1) return { headers: parseHeaders(norm), body: '' };
  return { headers: parseHeaders(norm.slice(0, idx)), body: norm.slice(idx + 2) };
}

function parseHeaders(block) {
  const lines = block.split('\n');
  const list = [];
  let cur = '';
  for (const ln of lines) {
    if (/^[ \t]/.test(ln) && list.length) {
      list[list.length - 1] += ' ' + ln.trim(); // 折叠续行
    } else {
      list.push(ln);
    }
  }
  const map = [];
  for (const ln of list) {
    const i = ln.indexOf(':');
    if (i > 0) map.push([ln.slice(0, i).trim().toLowerCase(), ln.slice(i + 1).trim()]);
  }
  return map;
}

function getHeader(map, name) {
  const n = name.toLowerCase();
  for (const [k, v] of map) if (k === n) return v;
  return '';
}

function extractFrom(v) {
  if (!v) return '';
  const m = v.match(/<([^>]+)>/);
  return decodeRFC2047(m ? m[1] : v).trim();
}

function getBoundary(ctype) {
  const m = ctype.match(/boundary="?([^";]+)"?/i);
  return m ? m[1] : null;
}

function getCharset(ctype) {
  const m = ctype.match(/charset="?([^";]+)"?/i);
  return m ? m[1].toLowerCase() : 'utf-8';
}

// 递归收集 text/plain 与 text/html
function collectParts(headers, body, out) {
  const ctype = getHeader(headers, 'content-type') || 'text/plain';
  const cte = (getHeader(headers, 'content-transfer-encoding') || '').toLowerCase();

  if (/^multipart\//i.test(ctype)) {
    const boundary = getBoundary(ctype);
    if (!boundary) return;
    const parts = splitMultipart(body, boundary);
    for (const p of parts) {
      const { headers: ph, body: pb } = splitHeadersBody(p);
      collectParts(ph, pb, out);
    }
    return;
  }

  const charset = getCharset(ctype);
  const decoded = decodeBody(body, cte, charset);
  if (/^text\/html/i.test(ctype)) {
    if (!out.html) out.html = decoded;
  } else if (/^text\/plain/i.test(ctype)) {
    if (!out.text) out.text = decoded;
  }
}

function splitMultipart(body, boundary) {
  const marker = '--' + boundary;
  const segs = body.split(marker);
  const parts = [];
  for (let seg of segs) {
    if (seg === '' || seg === '--' || /^--\s*$/.test(seg)) continue;
    seg = seg.replace(/^\n/, '').replace(/\n$/, '');
    if (seg.trim()) parts.push(seg);
  }
  return parts;
}

function decodeBody(body, cte, charset) {
  let bytes;
  if (cte === 'base64') {
    bytes = base64ToBytes(body.replace(/\s+/g, ''));
  } else if (cte === 'quoted-printable') {
    bytes = qpToBytes(body);
  } else {
    return decodeBytes(strToBytes(body), charset);
  }
  return decodeBytes(bytes, charset);
}

function base64ToBytes(b64) {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

function qpToBytes(str) {
  const s = str.replace(/=\r?\n/g, ''); // 软换行
  const out = [];
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '=' && i + 2 < s.length) {
      const hex = s.substr(i + 1, 2);
      if (/^[0-9A-Fa-f]{2}$/.test(hex)) { out.push(parseInt(hex, 16)); i += 2; continue; }
    }
    out.push(s.charCodeAt(i) & 0xff);
  }
  return new Uint8Array(out);
}

function strToBytes(str) {
  // 原始 8bit 文本：按 latin1 取字节，再交给 TextDecoder 按 charset 解
  const arr = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) arr[i] = str.charCodeAt(i) & 0xff;
  return arr;
}

function decodeBytes(bytes, charset) {
  try {
    return new TextDecoder(charset || 'utf-8').decode(bytes);
  } catch (_) {
    return new TextDecoder('utf-8').decode(bytes);
  }
}

// RFC2047：=?charset?B/Q?text?=  （主题/发件人里的非 ASCII）
function decodeRFC2047(str) {
  if (!str || str.indexOf('=?') === -1) return str;
  return str.replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g, (_, cs, enc, txt) => {
    try {
      if (enc.toUpperCase() === 'B') return decodeBytes(base64ToBytes(txt.replace(/\s+/g, '')), cs.toLowerCase());
      return decodeBytes(qpToBytes(txt.replace(/_/g, ' ')), cs.toLowerCase());
    } catch (_) {
      return txt;
    }
  }).replace(/\?=\s+=\?/g, ''); // 相邻编码词间空白
}
