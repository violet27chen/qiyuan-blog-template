// scripts/_test_chat_local.mjs
// 本地测试 /chat-api/chat/completions 的真实 RAG 流式管线（不经过 EdgeOne 部署）
// 直接 import 线上边缘函数入口 onRequest，构造一个指向 /chat-api 的 mock Request，
// 由 handleChatRag 完成：硅基流动嵌入 → Neon pgvector 检索 top-5 → DeepSeek 流式生成(SSE)。
//
// 用法：
//   SILICONFLOW_API_KEY=... NEON_SERVERLESS_URL=... \
//     node scripts/_test_chat_local.mjs "你的问题"
//
// 密钥只从环境变量读取，本文件不写任何凭据。
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const edgeFnPath = resolve(__dirname, '../edge-functions/api/[[default]].js');

const mod = await import(pathToFileURL(edgeFnPath).href);
const onRequest = mod.default;

const env = {
  SILICONFLOW_API_KEY: process.env.SILICONFLOW_API_KEY,
  NEON_SERVERLESS_URL: process.env.NEON_SERVERLESS_URL,
};

for (const k of ['SILICONFLOW_API_KEY', 'NEON_SERVERLESS_URL']) {
  if (!env[k]) {
    console.error(`缺少环境变量 ${k}`);
    process.exit(2);
  }
}

const question = process.argv[2] || '你们博客里有哪些关于 VPN 的文章？推荐一下';

const request = new Request('https://localhost/chat-api/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Origin: 'https://www.qiyuan.icu' },
  body: JSON.stringify({
    model: 'deepseek-ai/DeepSeek-V4-Flash',
    messages: [{ role: 'user', content: question }],
    stream: true,
    temperature: 0.3,
  }),
});

const t0 = Date.now();
const resp = await onRequest({ request, env });
console.error('HTTP status:', resp.status);
console.error('Content-Type:', resp.headers.get('Content-Type'));
console.error('CORS Allow-Origin:', resp.headers.get('Access-Control-Allow-Origin'));

if (!resp.body) {
  const txt = await resp.text().catch(() => '');
  console.error('无流式 body，响应体：', txt);
  process.exit(1);
}

const reader = resp.body.getReader();
const decoder = new TextDecoder();
let chunks = 0;
let firstChunkAt = null;
let dataEvents = 0;
console.error('--- SSE 流式输出开始 ---');
while (true) {
  const { value, done } = await reader.read();
  if (done) break;
  chunks++;
  if (firstChunkAt === null) firstChunkAt = Date.now() - t0;
  const text = decoder.decode(value, { stream: true });
  if (/data:/.test(text)) dataEvents++;
  process.stdout.write(text);
}
console.error('\n--- 流结束 ---');
console.error(`chunks=${chunks}, 含 data: 事件=${dataEvents}, 首包延迟=${firstChunkAt ?? 'n/a'}ms, 总耗时=${Date.now() - t0}ms`);
