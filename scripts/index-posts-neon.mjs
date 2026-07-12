/**
 * scripts/index-posts-neon.mjs
 * 手动索引脚本：npm run index:neon
 * 实际逻辑在 scripts/lib/rag-index.mjs 的 indexPostsToNeon()（构建时集成也复用它）。
 *
 * 环境变量（终端或 CI 导出，不要写进仓库）：
 *   SILICONFLOW_API_KEY   硅基流动 API Key
 *   NEON_SERVERLESS_URL   Neon 连接串（postgresql://user:pass@host/db）
 */

import { indexPostsToNeon } from './lib/rag-index.mjs';

const SF_KEY = process.env.SILICONFLOW_API_KEY;
const NEON_URL = process.env.NEON_SERVERLESS_URL;

if (!SF_KEY || !NEON_URL) {
  console.error('[index:neon] 缺少环境变量 SILICONFLOW_API_KEY / NEON_SERVERLESS_URL');
  process.exit(1);
}

indexPostsToNeon({ apiKey: SF_KEY, neonUrl: NEON_URL, onLog: console.log })
  .then((n) => console.log(`[index:neon] 完成，成功索引 ${n} 篇。`))
  .catch((e) => {
    console.error('[index:neon] 失败:', e?.message || e);
    process.exit(1);
  });
