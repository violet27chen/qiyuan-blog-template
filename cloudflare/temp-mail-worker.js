// 临时邮箱收信 Worker（Cloudflare）
// 职责：接收 Email Routing 转发（catch-all *@白嫖域名）的邮件，解析后写入 D1。
// 部署：在 cloudflare/ 目录执行
//   npm init -y && npm i postal-mime
//   wrangler deploy            （见同目录 wrangler.toml）
// 注意：本 Worker 只负责「收信 + 入库」，对外不暴露任何 fetch API；
//       读信 / 生成地址由 EdgeOne 边缘函数 /api/temp-mail/* 完成（同源、国内走 EdgeOne 稳）。
import PostalMime from 'postal-mime';

const RETENTION_MS = 24 * 60 * 60 * 1000; // 24 小时保留期

export default {
  async email(message, env, ctx) {
    const to = String(message.to || '').toLowerCase().trim();

    const now = Date.now();
    const cutoff = now - RETENTION_MS;

    // 清理 24h 前过期的地址及其邮件（先删邮件再删地址，避免孤儿行）
    try {
      await env.DB.prepare(
        'DELETE FROM temp_messages WHERE addr IN (SELECT addr FROM temp_addresses WHERE created_at < ?)'
      ).bind(cutoff).run();
      await env.DB.prepare('DELETE FROM temp_addresses WHERE created_at < ?').bind(cutoff).run();
    } catch (e) {
      console.error('[temp-mail] cleanup failed:', e?.message || e);
    }

    // 记录/更新收件地址（供 24h 清理用；INSERT OR IGNORE 保留首次创建时间）
    try {
      await env.DB.prepare(
        'INSERT OR IGNORE INTO temp_addresses (addr, created_at) VALUES (?, ?)'
      ).bind(to, now).run();
    } catch (e) {
      console.error('[temp-mail] address upsert failed:', e?.message || e);
    }

    // 解析邮件正文（postal-mime 兼容 Worker，接受 ReadableStream / string）
    let mail;
    try {
      const parser = new PostalMime();
      mail = await parser.parse(message.raw);
    } catch (e) {
      console.error('[temp-mail] parse failed:', e?.message || e);
      mail = {
        from: { address: message.from || '' },
        subject: '(解析失败)',
        text: typeof message.raw === 'string' ? message.raw : '',
        html: null,
      };
    }

    try {
      await env.DB.prepare(
        `INSERT OR IGNORE INTO temp_messages
         (id, addr, from_addr, subject, body_text, body_html, received_at, raw_size)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        crypto.randomUUID(),
        to,
        (mail.from && mail.from.address) || message.from || '',
        mail.subject || '(无主题)',
        mail.text || '',
        mail.html || null,
        now,
        message.rawSize || 0
      ).run();
    } catch (e) {
      console.error('[temp-mail] insert failed:', e?.message || e);
    }
  },
};
