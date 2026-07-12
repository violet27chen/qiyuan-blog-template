/**
 * integrations/index-rag-neon.mjs
 * Astro 集成：构建完成时(astro:build:done)自动把全站文章索引进 Neon 向量库，
 * 实现「每次更新文章构建时自动生成向量」。逻辑复用 scripts/lib/rag-index.mjs。
 *
 * 注册方式(astro.config.mjs):
 *   import indexRagNeon from './integrations/index-rag-neon.mjs';
 *   integrations: [ ..., indexRagNeon() ]
 *
 * 说明：
 *   - 仅在构建环境存在 SILICONFLOW_API_KEY / NEON_SERVERLESS_URL 时执行索引；
 *     本地开发构建若未设置这两个变量，会跳过并仅打印警告，不会打断构建。
 *   - 索引失败也只记录错误，不影响 astro build 产物（部署仍照常）。
 *   - 资源站资源(products)的向量不在这里处理（在 Supabase，由边缘函数发布/更新自动嵌入 + 回填脚本）。
 */

import { indexPostsToNeon } from '../scripts/lib/rag-index.mjs';

export default function indexRagNeon(options = {}) {
  return {
    name: 'index-rag-neon',
    hooks: {
      'astro:build:done': async ({ logger }) => {
        const apiKey = process.env.SILICONFLOW_API_KEY;
        const neonUrl = process.env.NEON_SERVERLESS_URL;
        if (!apiKey || !neonUrl) {
          const msg = '[index-rag-neon] 未设置 SILICONFLOW_API_KEY / NEON_SERVERLESS_URL，跳过向量索引（本地构建可忽略；部署/CI 请注入这两个变量）';
          if (logger?.warn) logger.warn(msg);
          else console.warn(msg);
          return;
        }
        const log = (m) => { if (logger?.info) logger.info(m); else console.log(m); };
        const err = (m) => { if (logger?.error) logger.error(m); else console.error(m); };

        // 索引博客文章到 Neon rag_posts
        try {
          const n = await indexPostsToNeon({ apiKey, neonUrl, onLog: log });
          log(`[index-rag-neon] 已自动索引 ${n} 篇向量到 Neon rag_posts`);
        } catch (e) {
          err(`[index-rag-neon] 文章索引失败: ${e?.message || e}`);
        }
      },
    },
  };
}
