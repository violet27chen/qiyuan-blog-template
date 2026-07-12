let SUPABASE_URL = '';
let SUPABASE_KEY = '';
let JWT_SEC = '';

// 允许的跨域来源 - 部署后改为你的资源站域名
const ALLOWED_ORIGINS = ['https://resources.qiyuan.icu', 'http://resources.qiyuan.icu', 'https://www.resources.qiyuan.icu', 'http://www.resources.qiyuan.icu'];

// 安全响应头：注入到所有 API 响应（经 getCorsHeaders 统一 spread）。
// - X-Frame-Options 用 SAMEORIGIN 而非 DENY：资源站内联预览需在同站 iframe 渲染。
// - HSTS 仅 max-age+includeSubDomains（未上 preload 列表，不加 preload）。
// 静态资源的安全头由 EdgeOne「修改 HTTP 响应头」规则统一注入，不在此处理。
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
};

function getCorsHeaders(origin) {
  const headers = {
    ...SECURITY_HEADERS,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
  
  // 检查 Origin 是否在允许列表中，或者是本地开发环境
  origin = origin || '';
  if (ALLOWED_ORIGINS.includes(origin) || origin.includes('localhost') || origin.includes('127.0.0.1')) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Vary'] = 'Origin'; // 告诉缓存服务器根据 Origin 变化
  } else {
    // 默认仍然允许，但设置为第一个允许的源
    headers['Access-Control-Allow-Origin'] = ALLOWED_ORIGINS[0];
  }
  
  return headers;
}

// 向后兼容，保持 CORS 变量，但推荐使用 getCorsHeaders
const CORS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS[0],
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// 注意：json 和 err 函数需要 origin 参数才能正确设置 CORS 头部
// 为了向后兼容，保持默认使用第一个允许的源，但推荐在 onRequest 中使用完整版本
function json(d, s=200, origin='') { 
  const headers = {'Content-Type':'application/json', ...getCorsHeaders(origin)};
  return new Response(JSON.stringify(d), {status:s, headers:headers}); 
}
function err(m, s=400, origin='') { return json({error:m}, s, origin); }

function jsonNoStore(d, s=200, origin='') {
  const headers = {'Content-Type':'application/json', 'Cache-Control': 'no-store', ...getCorsHeaders(origin)};
  return new Response(JSON.stringify(d), {status:s, headers:headers});
}

async function sbGet(table, params='') {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' }
  });
  return r.json();
}
async function sbPost(table, data) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST', headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' }, body: JSON.stringify(data)
  });
  return r.json();
}
async function sbPatch(table, match, data) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${match}`, {
    method: 'PATCH', headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' }, body: JSON.stringify(data)
  });
  return r.json();
}
async function sbDel(table, match) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${match}`, {
    method: 'DELETE', headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  return r.ok;
}

async function hashPw(pw) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pw));
  return Array.from(new Uint8Array(h)).map(b=>b.toString(16).padStart(2,'0')).join('');
}

async function sha256Hex(s) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(s)));
  return Array.from(new Uint8Array(h)).map(b=>b.toString(16).padStart(2,'0')).join('');
}

function base64Url(bytes) {
  const b64 = btoa(String.fromCharCode(...bytes));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function randomToken(prefix='mcp_', bytes=32) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return prefix + base64Url(arr);
}

async function getUserByMcpKey(key) {
  if (!key || typeof key !== 'string') return null;
  if (key.length < 20) return null;
  const prefix = key.slice(0, 24);
  const keyHash = await sha256Hex(key);
  const users = await sbGet('users', `mcp_key_prefix=eq.${prefix}&mcp_key_hash=eq.${keyHash}&mcp_key_revoked=is.false&select=id,username,email`);
  return Array.isArray(users) ? users[0] : null;
}

function mcpResult(id, result, origin='') {
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...getCorsHeaders(origin) };
  return new Response(JSON.stringify({ jsonrpc: '2.0', id: id ?? null, result }), { status: 200, headers });
}

function mcpError(id, code, message, origin='') {
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...getCorsHeaders(origin) };
  return new Response(JSON.stringify({ jsonrpc: '2.0', id: id ?? null, error: { code, message } }), { status: 200, headers });
}

function mcpToolText(payload) {
  return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }] };
}

function mcpTools() {
  return [
    {
      name: 'publish_product',
      description: '发布资源到 resources.qiyuan.icu（支持多网盘链接，写入 products 表）',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          category: { type: 'string' },
          drive_link: { type: 'string' },
          link: { type: 'string' },
          quark_link: { type: 'string' },
          price: { type: 'number' },
          image_url: { type: 'string' },
          thumb_url: { type: 'string' },
          is_active: { type: 'boolean' }
        },
        required: ['name', 'image_url']
      }
    },
    {
      name: 'update_product',
      description: '更新商品（仅自己发布的）',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          description: { type: 'string' },
          category: { type: 'string' },
          drive_link: { type: 'string' },
          link: { type: 'string' },
          quark_link: { type: 'string' },
          price: { type: 'number' },
          image_url: { type: 'string' },
          thumb_url: { type: 'string' },
          is_active: { type: 'boolean' }
        },
        required: ['id']
      }
    },
    {
      name: 'delete_product',
      description: '删除商品（仅自己发布的）',
      inputSchema: {
        type: 'object',
        properties: { id: { type: 'integer' } },
        required: ['id']
      }
    },
    {
      name: 'list_products',
      description: '列出商品（公开列表或仅本人 mine=true）',
      inputSchema: {
        type: 'object',
        properties: {
          q: { type: 'string' },
          category: { type: 'string' },
          page: { type: 'integer' },
          limit: { type: 'integer' },
          mine: { type: 'boolean' }
        }
      }
    },
    {
      name: 'list_categories',
      description: '列出分类（来自上架商品）',
      inputSchema: { type: 'object', properties: {} }
    },
    {
      name: 'upload_product_image_from_url',
      description: '从图片 URL 抓取并上传（返回 /api/images/...）',
      inputSchema: {
        type: 'object',
        properties: { source_url: { type: 'string' } },
        required: ['source_url']
      }
    },
    {
      name: 'upload_product_image',
      description: '直接上传图片数据（base64 编码）（返回 /api/images/...）',
      inputSchema: {
        type: 'object',
        properties: { 
          image_data: { type: 'string', description: 'Base64 编码的图片数据' },
          content_type: { type: 'string', description: '图片 MIME 类型（如 image/jpeg）' }
        },
        required: ['image_data', 'content_type']
      }
    },
    {
      name: 'health',
      description: '健康检查',
      inputSchema: { type: 'object', properties: {} }
    }
  ];
}

function safeFilename(name) {
  return String(name || '').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
}

function extFromContentType(contentType) {
  const ct = (contentType || '').toLowerCase();
  if (ct.includes('image/jpeg')) return 'jpg';
  if (ct.includes('image/png')) return 'png';
  if (ct.includes('image/webp')) return 'webp';
  if (ct.includes('image/gif')) return 'gif';
  if (ct.includes('image/avif')) return 'avif';
  return '';
}

async function genToken(uid, un) {
  const hdr = btoa(JSON.stringify({alg:'HS256',typ:'JWT'}));
  const pld = btoa(JSON.stringify({sub:uid,username:un,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+604800}));
  const msg = hdr+'.'+pld;
  const key = await crypto.subtle.importKey('raw',new TextEncoder().encode(JWT_SEC),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const sig = await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(msg));
  return msg+'.'+btoa(String.fromCharCode(...new Uint8Array(sig)));
}

async function vToken(tok) {
  try {
    const [h,p,s]=tok.split('.');
    const key = await crypto.subtle.importKey('raw',new TextEncoder().encode(JWT_SEC),{name:'HMAC',hash:'SHA-256'},false,['verify']);
    if(!await crypto.subtle.verify('HMAC',key,Uint8Array.from(atob(s),c=>c.charCodeAt(0)),new TextEncoder().encode(h+'.'+p))) return null;
    const pl=JSON.parse(atob(p));
    return pl.exp>Math.floor(Date.now()/1000)?pl:null;
  } catch { return null; }
}

async function getUser(req) {
  const a=req.headers.get('Authorization');
  return a?.startsWith('Bearer ')?await vToken(a.slice(7)):null;
}

function detectCloud(u) {
  if(!u) return null;
  const l=u.toLowerCase();
  // 国内网盘
  if(l.includes('quark.cn')||l.includes('pan.quark')||l.includes('quark.com')) return 'quark';
  if(l.includes('baidu.com')||l.includes('pan.baidu')||l.includes('yun.baidu')) return 'baidu';
  if(l.includes('aliyundrive')||l.includes('alipan')||l.includes('aliyundrive.net')) return 'aliyun';
  if(l.includes('lanzou')||l.includes('lanzoui')||l.includes('lanzoux')||l.includes('lanzouw')||l.includes('lanzouy')||l.includes('lzpan')) return 'lanzou';
  if(l.includes('ctfile.com')||l.includes('ctpan')||l.includes('ctfile.net')) return 'ctfile';
  if(l.includes('115.com')||l.includes('115网盘')||l.includes('115cdn')) return '115';
  if(l.includes('cloud.189.cn')||l.includes('ctyun')||l.includes('189.cn')) return 'tianyi';
  if(l.includes('weiyun')||l.includes('wo.cn')||l.includes('weiyun.com')) return 'weiyun';
  if(l.includes('nutstore')||l.includes('坚果云')||l.includes('jianguoyun')) return 'nutstore';
  if(l.includes('xunlei.com')||l.includes('pan.xunlei')||l.includes('xlpan.com')||l.includes('迅雷')) return 'xunlei';
  if(l.includes('guangya')||l.includes('guangyapan')||l.includes('光鸭')) return 'guangya';
  // 国际网盘
  if(l.includes('onedrive')||l.includes('1drv.com')||l.includes('sharepoint.com')||l.includes('1drv.ms')) return 'onedrive';
  if(l.includes('drive.google.com')||l.includes('docs.google.com')||l.includes('google.com/drive')) return 'gdrive';
  if(l.includes('mega.nz')||l.includes('mega.co.nz')||l.includes('mega.io')) return 'mega';
  if(l.includes('pcloud.com')||l.includes('pcloud.link')) return 'pcloud';
  if(l.includes('mediafire.com')||l.includes('mfire')) return 'mediafire';
  if(l.includes('wetransfer.com')||l.includes('we.tl')||l.includes('wetransfer.net')) return 'wetransfer';
  if(l.includes('box.com')||l.includes('box.net')) return 'box';
  if(l.includes('dropbox.com')||l.includes('db.tt')||l.includes('dropbox.link')) return 'dropbox';
  return null;
}

export default async function onRequest(context) {
  const request = context.request;
  const env = context.env || {};
  SUPABASE_URL = env.SUPABASE_URL || '';
  SUPABASE_KEY = env.SUPABASE_SERVICE_KEY || '';
  JWT_SEC = env.JWT_SECRET || '';
  const url = new URL(request.url, "https://resources.qiyuan.icu");
  const path = url.pathname.replace(/^\/api/, '');
  const method = request.method;
  const origin = request.headers.get('Origin') || '';
  
  if(method==='OPTIONS') return new Response(null,{status:204,headers:getCorsHeaders(origin)});

  try {
    if(path==='/mcp/key' && method==='POST') {
      const b = await request.json();
      const username = (b.username || '').trim();
      const password = b.password || '';
      const force = !!b.force;
      if(!username || !password) return err('请输入用户名和密码', 400, origin);

      const users = await sbGet('users', `or=(username.eq.${username},email.eq.${username})&select=id,username,email,password_hash,mcp_key_hash,mcp_key_prefix,mcp_key_revoked`);
      const user = Array.isArray(users) ? users[0] : null;
      if(!user) return err('用户名或密码错误', 401, origin);
      if(await hashPw(password) !== user.password_hash) return err('用户名或密码错误', 401, origin);

      if(user.mcp_key_hash && !user.mcp_key_revoked && user.mcp_key_prefix && !force) {
        return jsonNoStore({
          message: '已存在 MCP Key（请在客户端保存你的 Key；如需重置请传 force=true）'
        }, 200, origin);
      }

      const key = randomToken('mcp_', 32);
      const keyHash = await sha256Hex(key);
      const prefix = key.slice(0, 24);
      const patched = await sbPatch('users', `id=eq.${user.id}`, { mcp_key_hash: keyHash, mcp_key_prefix: prefix, mcp_key_created_at: new Date().toISOString(), mcp_key_revoked: false });
      if(patched?.code) return err('生成 MCP Key 失败', 500, origin);

      return jsonNoStore({
        mcp_key: key,
        mcp_url: `https://resources.qiyuan.icu/api/mcp/${key}`
      }, 200, origin);
    }

    if(path==='/mcp/status' && method==='GET') {
      const au = await getUser(request);
      if(!au) return err('未登录', 401, origin);
      const users = await sbGet('users', `id=eq.${au.sub}&select=id,username,mcp_key_hash,mcp_key_prefix,mcp_key_created_at,mcp_key_revoked`);
      const user = Array.isArray(users) ? users[0] : null;
      if(!user) return err('用户不存在', 404, origin);
      const hasKey = !!user.mcp_key_hash && !user.mcp_key_revoked;
      const prefix = user.mcp_key_prefix || null;
      const masked = (hasKey && prefix) ? `https://resources.qiyuan.icu/api/mcp/${prefix}...` : null;
      return jsonNoStore({
        user: { id: user.id, username: user.username },
        has_key: hasKey,
        key_prefix: prefix,
        key_created_at: user.mcp_key_created_at || null,
        mcp_url_masked: masked,
        mcp_url_template: 'https://resources.qiyuan.icu/api/mcp/<YOUR_MCP_KEY>'
      }, 200, origin);
    }

    if(path==='/mcp/rotate' && method==='POST') {
      const au = await getUser(request);
      if(!au) return err('未登录', 401, origin);
      const users = await sbGet('users', `id=eq.${au.sub}&select=id`);
      const user = Array.isArray(users) ? users[0] : null;
      if(!user) return err('用户不存在', 404, origin);
      const key = randomToken('mcp_', 32);
      const keyHash = await sha256Hex(key);
      const prefix = key.slice(0, 24);
      const patched = await sbPatch('users', `id=eq.${user.id}`, { mcp_key_hash: keyHash, mcp_key_prefix: prefix, mcp_key_created_at: new Date().toISOString(), mcp_key_revoked: false });
      if(patched?.code) return err('生成 MCP Key 失败', 500, origin);
      return jsonNoStore({ mcp_key: key, mcp_url: `https://resources.qiyuan.icu/api/mcp/${key}` }, 200, origin);
    }

    if(path.startsWith('/mcp/upload/')&&method==='POST'){
      const key = path.slice('/mcp/upload/'.length);
      const u = await getUserByMcpKey(key);
      if(!u) return err('无效的 MCP Key',401,origin);
      const fd=await request.formData();
      const file=fd.get('file');
      if(!file) return err('未选择文件',400,origin);
      if(file.size>5*1024*1024) return err('文件不能超5MB',400,origin);
      if(!file.type.startsWith('image/')) return err('只支持图片文件',400,origin);
      const ext=extFromContentType(file.type) || file.name.split('.').pop()||'jpg';
      const fn=`product_${Date.now()}_${Math.random().toString(36).slice(2,10)}.${ext}`;
      const buf=await file.arrayBuffer();
      const r=await fetch(`${SUPABASE_URL}/storage/v1/object/product-images/${fn}`,{
          method:'POST',
          headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Content-Type':file.type||'application/octet-stream'},
          body:buf
      });
      if(!r.ok) return err('上传失败',500,origin);
      return json({url:`/api/images/${fn}`,filename:fn},200,origin);
    }

    if(path.startsWith('/mcp/') && method==='POST') {
      const key = path.slice('/mcp/'.length);
      const u = await getUserByMcpKey(key);
      if(!u) return mcpError(null, -32001, 'Unauthorized: invalid MCP key', origin);

      const body = await request.json().catch(() => null);
      if(!body || body.jsonrpc !== '2.0') return mcpError(null, -32600, 'Invalid Request', origin);

      const id = body.id ?? null;
      const m = body.method;
      const params = body.params || {};

      if(m === 'initialize') {
        return mcpResult(id, {
          serverInfo: { name: 'resources.qiyuan.icu', version: '1.0.0' },
          capabilities: { tools: {} }
        }, origin);
      }

      if(m === 'tools/list') {
        return mcpResult(id, { tools: mcpTools() }, origin);
      }

      if(m === 'tools/call') {
        const toolName = params.name;
        const args = params.arguments || {};

        if(toolName === 'health') {
          return mcpResult(id, mcpToolText({ ok: true, user: { id: u.id, username: u.username } }), origin);
        }

        if(toolName === 'list_categories') {
          const data=await sbGet('products','select=category&is_active=eq.true');
          const cats=[...new Set((Array.isArray(data)?data:[]).map(p=>p.category).filter(c=>c&&c!=='NULL'))].sort();
          return mcpResult(id, mcpToolText({ categories: cats }), origin);
        }

        if(toolName === 'list_products') {
          const q = (args.q || '').trim();
          const category = (args.category || '').trim();
          const mine = !!args.mine;
          const pg = parseInt(args.page || '1');
          const lm = parseInt(args.limit || '20');
          const pageNum = Number.isFinite(pg) && pg > 0 ? pg : 1;
          const limitNum = Number.isFinite(lm) && lm > 0 && lm <= 100 ? lm : 20;

          let paramsStr = `order=created_at.desc&offset=${(pageNum-1)*limitNum}&limit=${limitNum}`;
          if(mine) paramsStr = `user_id=eq.${u.id}&` + paramsStr;
          else paramsStr = `is_active=eq.true&` + paramsStr;
          if(q) paramsStr += `&or=(name.ilike.%25${q}%25,description.ilike.%25${q}%25)`;
          if(category && category !== 'all') paramsStr += `&category=eq.${category}`;
          const data = await sbGet('products', paramsStr);
          return mcpResult(id, mcpToolText({ products: Array.isArray(data)?data:[], page: pageNum, limit: limitNum }), origin);
        }

        if(toolName === 'upload_product_image_from_url') {
          const sourceUrl = String(args.source_url || '').trim();
          if(!sourceUrl) return mcpError(id, -32602, 'source_url is required', origin);

          const r = await fetch(sourceUrl, { method: 'GET' });
          if(!r.ok) return mcpError(id, -32002, `Image fetch failed: ${r.status}`, origin);
          const ct = r.headers.get('content-type') || '';
          const cl = r.headers.get('content-length');
          if(cl && Number(cl) > 5*1024*1024) return mcpError(id, -32002, 'Image too large', origin);
          const buf = await r.arrayBuffer();
          if(buf.byteLength > 5*1024*1024) return mcpError(id, -32002, 'Image too large', origin);
          if(ct && !ct.toLowerCase().startsWith('image/')) return mcpError(id, -32002, 'Not an image', origin);

          const ext = extFromContentType(ct);
          const fn = safeFilename(`product_${Date.now()}_${Math.random().toString(36).slice(2,10)}${ext?'.'+ext:''}`);
          const up = await fetch(`${SUPABASE_URL}/storage/v1/object/product-images/${fn}`,{
            method:'POST',
            headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Content-Type':ct||'application/octet-stream'},
            body:buf
          });
          if(!up.ok) return mcpError(id, -32003, 'Upload failed', origin);
          return mcpResult(id, mcpToolText({ url: `/api/images/${fn}`, filename: fn }), origin);
        }

        if(toolName === 'upload_product_image') {
          const imageData = String(args.image_data || '').trim();
          const contentType = String(args.content_type || '').trim();
          
          if(!imageData) return mcpError(id, -32602, 'image_data is required', origin);
          if(!contentType) return mcpError(id, -32602, 'content_type is required', origin);
          
          if(!contentType.toLowerCase().startsWith('image/')) return mcpError(id, -32002, 'Not an image', origin);
          
          let base64Data = imageData;
          if(base64Data.includes(',')) {
            base64Data = base64Data.split(',')[1];
          }
          
          let buf;
          try {
            const binaryString = atob(base64Data);
            const uint8Array = new Uint8Array(binaryString.length);
            for(let i = 0; i < binaryString.length; i++) {
              uint8Array[i] = binaryString.charCodeAt(i);
            }
            buf = uint8Array.buffer;
          } catch(e) {
            return mcpError(id, -32002, 'Invalid base64 data', origin);
          }
          
          if(buf.byteLength > 5*1024*1024) return mcpError(id, -32002, 'Image too large', origin);
          
          const ext = extFromContentType(contentType);
          const fn = safeFilename(`product_${Date.now()}_${Math.random().toString(36).slice(2,10)}${ext?'.'+ext:''}`);
          
          const up = await fetch(`${SUPABASE_URL}/storage/v1/object/product-images/${fn}`,{
            method:'POST',
            headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Content-Type':contentType},
            body:buf
          });
          
          if(!up.ok) return mcpError(id, -32003, 'Upload failed', origin);
          
          return mcpResult(id, mcpToolText({ url: `/api/images/${fn}`, filename: fn }), origin);
        }

        if(toolName === 'publish_product') {
          const pname = String(args.name || '').trim();
          if(!pname) return mcpError(id, -32602, 'name is required', origin);
          const imageUrl = args.image_url == null ? '' : String(args.image_url).trim();
          if(!imageUrl) return mcpError(id, -32602, 'image_url is required', origin);
          const link = String(args.drive_link || args.link || args.quark_link || args.pan_link || args.cloud_link || '').trim();
          if(!link) return mcpError(id, -32602, 'drive_link is required', origin);
          const category = (args.category && String(args.category).trim()) ? String(args.category).trim() : 'all';
          const insertData = {
            name: pname,
            description: args.description == null ? null : String(args.description),
            category: category,
            image_url: imageUrl,
            thumb_url: args.thumb_url ? String(args.thumb_url) : null,
            quark_link: link,
            cloud_type: detectCloud(link),
            price: args.price == null ? 0.00 : Number(args.price),
            is_active: args.is_active == null ? true : !!args.is_active,
            user_id: u.id
          };
          delete insertData.id;
          const result = await sbPost('products', insertData);
          if(result && result.code) return mcpError(id, -32010, `Create failed: ${result.message||'unknown'}`, origin);
          return mcpResult(id, mcpToolText({ product: Array.isArray(result)?result[0]:result }), origin);
        }

        if(toolName === 'update_product') {
          const pid = Number(args.id);
          if(!Number.isFinite(pid)) return mcpError(id, -32602, 'id is required', origin);
          const ex = await sbGet('products',`id=eq.${pid}&select=user_id`);
          const e = Array.isArray(ex)?ex[0]:null;
          if(!e || e.user_id !== u.id) return mcpError(id, -32011, 'Forbidden', origin);
          const patch = {};
          if(args.name != null) patch.name = String(args.name).trim();
          if(args.description != null) patch.description = String(args.description);
          if(args.category != null) patch.category = (String(args.category).trim() || 'all');
          if(args.price != null) patch.price = Number(args.price);
          if(args.image_url != null) {
            const imageUrl = String(args.image_url).trim();
            if(!imageUrl) return mcpError(id, -32602, 'image_url cannot be empty', origin);
            patch.image_url = imageUrl;
          }
          if(args.thumb_url != null) patch.thumb_url = String(args.thumb_url);
          if(args.is_active != null) patch.is_active = !!args.is_active;
          const newLink = (args.drive_link != null || args.link != null || args.quark_link != null || args.pan_link != null || args.cloud_link != null)
            ? String(args.drive_link || args.link || args.quark_link || args.pan_link || args.cloud_link || '').trim()
            : '';
          if(newLink) {
            patch.quark_link = newLink;
            patch.cloud_type = detectCloud(newLink);
          } else if (args.drive_link != null || args.link != null || args.quark_link != null || args.pan_link != null || args.cloud_link != null) {
            return mcpError(id, -32602, 'drive_link cannot be empty', origin);
          }
          const result = await sbPatch('products', `id=eq.${pid}`, patch);
          if(result && result.code) return mcpError(id, -32012, `Update failed: ${result.message||'unknown'}`, origin);
          return mcpResult(id, mcpToolText({ product: Array.isArray(result)?result[0]:result }), origin);
        }

        if(toolName === 'delete_product') {
          const pid = Number(args.id);
          if(!Number.isFinite(pid)) return mcpError(id, -32602, 'id is required', origin);
          const ex = await sbGet('products',`id=eq.${pid}&select=user_id`);
          const e = Array.isArray(ex)?ex[0]:null;
          if(!e || e.user_id !== u.id) return mcpError(id, -32011, 'Forbidden', origin);
          await sbDel('reviews', `product_id=eq.${pid}`);
          await sbDel('products', `id=eq.${pid}`);
          return mcpResult(id, mcpToolText({ ok: true, id: pid }), origin);
        }

        return mcpError(id, -32601, 'Tool not found', origin);
      }

      return mcpError(id, -32601, 'Method not found', origin);
    }

    if(path==='/auth/login'&&method==='POST'){
      const{username,password}=await request.json();
      if(!username||!password) return err('请输入用户名和密码', 400, origin);
      const users=await sbGet('users',`or=(username.eq.${username},email.eq.${username})`);
      const user=Array.isArray(users)?users[0]:null;
      if(!user) return err('用户名或密码错误',401, origin);
      if(await hashPw(password)!==user.password_hash) return err('用户名或密码错误',401, origin);
      return json({token:await genToken(user.id,user.username),user:{id:user.id,username:user.username,email:user.email}}, 200, origin);
    }
    if(path==='/auth/register'&&method==='POST'){
      const{username,email,password,confirm_password}=await request.json();
      if(!username||!email||!password) return err('请填写所有字段', 400, origin);
      if(password!==confirm_password) return err('密码不一致', 400, origin);
      if(username.length<3) return err('用户名至少3位', 400, origin);
      if(!/[A-Z]/.test(password)) return err('密码需包含至少一个大写字母', 400, origin);
      if(!/[a-z]/.test(password)) return err('密码需包含至少一个小写字母', 400, origin);
      if(!/[0-9]/.test(password)) return err('密码需包含至少一个数字', 400, origin);
      if(!/[^A-Za-z0-9]/.test(password)) return err('密码需包含至少一个符号', 400, origin);
      const ex=await sbGet('users',`or=(username.eq.${username},email.eq.${email})`);
      if(Array.isArray(ex)&&ex.length>0) return err('用户名或邮箱已注册', 400, origin);
      const u=await sbPost('users',{username,email,password_hash:await hashPw(password)});
      if(u.code) return err('注册失败',500, origin);
      const user=Array.isArray(u)?u[0]:u;
      if(!user||!user.id) return err('注册失败',500, origin);
      return json({token:await genToken(user.id,user.username),user:{id:user.id,username:user.username,email:user.email}}, 200, origin);
    }
    if(path==='/auth/me'&&method==='GET'){
      const u=await getUser(request);
      if(!u) return err('未登录',401, origin);
      const users=await sbGet('users',`id=eq.${u.sub}&select=id,username,email,created_at`);
      return json({user:Array.isArray(users)?users[0]:null}, 200, origin);
    }
    if(path==='/auth/logout'&&method==='POST') return json({message:'已退出'}, 200, origin);
    if(path==='/auth/change-password'&&method==='POST'){
      const u=await getUser(request); if(!u) return err('请先登录',401, origin);
      const{current_password,new_password,confirm_password}=await request.json();
      if(!current_password||!new_password) return err('请填写所有字段', 400, origin);
      if(!/[A-Z]/.test(new_password)) return err('新密码需包含至少一个大写字母', 400, origin);
      if(!/[a-z]/.test(new_password)) return err('新密码需包含至少一个小写字母', 400, origin);
      if(!/[0-9]/.test(new_password)) return err('新密码需包含至少一个数字', 400, origin);
      if(!/[^A-Za-z0-9]/.test(new_password)) return err('新密码需包含至少一个符号', 400, origin);
      if(new_password!==confirm_password) return err('新密码不一致', 400, origin);
      const users=await sbGet('users',`id=eq.${u.sub}&select=id,password_hash`);
      const user=Array.isArray(users)?users[0]:null;
      if(!user) return err('用户不存在',404, origin);
      if(await hashPw(current_password)!==user.password_hash) return err('当前密码错误',401, origin);
      if(await hashPw(new_password)===user.password_hash) return err('新密码不能与旧密码相同', 400, origin);
      await sbPatch('users',`id=eq.${u.sub}`,{password_hash:await hashPw(new_password)});
      return json({message:'密码修改成功'}, 200, origin);
    }

    if(path==='/categories'&&method==='GET'){
      const data=await sbGet('products','select=category&is_active=eq.true');
      const cats=[...new Set((Array.isArray(data)?data:[]).map(p=>p.category).filter(c=>c&&c!=='NULL'))].sort();
      return json({categories:cats}, 200, origin);
    }
    if(path==='/products'&&method==='GET'){
      const q=url.searchParams.get('q')||'',cat=url.searchParams.get('cat')||'',all=url.searchParams.get('all');
      const pg=parseInt(url.searchParams.get('page')||'1'),lm=parseInt(url.searchParams.get('limit')||'20');
      let params=`order=created_at.desc&offset=${(pg-1)*lm}&limit=${lm}`;
      if(all!=='1') params=`is_active=eq.true&`+params;
      else{
        const u=await getUser(request); if(!u) return err('请先登录',401, origin);
        params=`user_id=eq.${u.sub}&`+params;
      }
      if(q) params+=`&or=(name.ilike.%25${q}%25,description.ilike.%25${q}%25)`;
      if(cat&&cat!=='all') params+=`&category=eq.${cat}`;
      const data=await sbGet('products',params);
      return json({products:Array.isArray(data)?data:[],total:Array.isArray(data)?data.length:0,page:pg,limit:lm}, 200, origin);
    }
    if(path.match(/^\/products\/\d+$/)&&method==='GET'){
      const id=path.split('/')[2];
      const prods=await sbGet('products',`id=eq.${id}`);
      const p=Array.isArray(prods)?prods[0]:null;
      if(!p) return err('商品不存在',404, origin);
      // 增加访问量
      await sbPatch('products', `id=eq.${id}`, { view_count: (p.view_count || 0) + 1 });
      const rv=await sbGet('reviews',`product_id=eq.${id}&order=created_at.desc`);
      return json({product:{...p, view_count: (p.view_count || 0) + 1},reviews:Array.isArray(rv)?rv:[]}, 200, origin);
    }
    if(path==='/products'&&method==='POST'){
      const u=await getUser(request); if(!u) return err('请先登录',401, origin);
      const b=await request.json();
      if(!b.name) return err('请输入商品名称', 400, origin);
      if(!b.quark_link || !String(b.quark_link).trim()) return err('请输入网盘链接', 400, origin);
      if(!b.image_url || !String(b.image_url).trim()) return err('请上传商品图片', 400, origin);
      // 处理 category 字段：空字符串或 null 时使用默认值 'all'
      const category = (b.category && b.category.trim()) ? b.category : 'all';
      // 构建要插入的数据，确保不包含 id 字段（安全第一）
      const insertData = {
        name: b.name,
        description: b.description,
        category: category,
        image_url: String(b.image_url).trim(),
        thumb_url: b.thumb_url || null,
        quark_link: String(b.quark_link).trim(),
        cloud_type: detectCloud(String(b.quark_link).trim()),
        price: b.price || 0.00,
        is_active: b.is_active !== undefined ? b.is_active : true,
        user_id: u.sub
      };
      // 双重保险：明确删除任何可能存在的 id 字段
      delete insertData.id;
      const result=await sbPost('products', insertData);
      if(result && result.code) {
        console.error('Supabase error:', result);
        let errorMsg = '创建商品失败';
        if(result.message) {
          errorMsg += ': ' + result.message;
        }
        return err(errorMsg, 500, origin);
      }
      const p=Array.isArray(result)?result[0]:result;
      return json({product:p}, 200, origin);
    }
    if(path.match(/^\/products\/\d+$/)&&method==='PUT'){
      const u=await getUser(request); if(!u) return err('请先登录',401, origin);
      const id=path.split('/')[2];
      const ex=await sbGet('products',`id=eq.${id}&select=user_id`);
      const e=Array.isArray(ex)?ex[0]:null;
      if(!e||e.user_id!==u.sub) return err('无权修改',403, origin);
      const b=await request.json();
      const updateData = {...b};
      if(b.quark_link) updateData.cloud_type=detectCloud(b.quark_link);
      if(b.quark_link !== undefined && !String(b.quark_link || '').trim()) return err('请输入网盘链接', 400, origin);
      if(b.image_url !== undefined && !String(b.image_url || '').trim()) return err('请上传商品图片', 400, origin);
      // 处理 category 字段
      if(b.category !== undefined) {
        updateData.category = (b.category && b.category.trim()) ? b.category : 'all';
      }
      const result=await sbPatch('products',`id=eq.${id}`,updateData);
      if(result.code) return err('更新商品失败: ' + (result.message || JSON.stringify(result)),500, origin);
      return json({product:Array.isArray(result)?result[0]:result}, 200, origin);
    }
    if(path.match(/^\/products\/\d+$/)&&method==='DELETE'){
      const u=await getUser(request); if(!u) return err('请先登录',401, origin);
      const id=path.split('/')[2];
      const ex=await sbGet('products',`id=eq.${id}&select=user_id`);
      const e=Array.isArray(ex)?ex[0]:null;
      if(!e||e.user_id!==u.sub) return err('无权删除',403, origin);
      await sbDel('reviews',`product_id=eq.${id}`);
      await sbDel('products',`id=eq.${id}`);
      return json({message:'已删除'}, 200, origin);
    }
    if(path.match(/^\/products\/\d+\/toggle$/)&&method==='POST'){
      const u=await getUser(request); if(!u) return err('请先登录',401, origin);
      const id=path.split('/')[2];
      const ex=await sbGet('products',`id=eq.${id}&select=user_id,is_active`);
      const e=Array.isArray(ex)?ex[0]:null;
      if(!e||e.user_id!==u.sub) return err('无权修改',403, origin);
      const result=await sbPatch('products',`id=eq.${id}`,{is_active:!e.is_active});
      return json({product:Array.isArray(result)?result[0]:result}, 200, origin);
    }
    if(path.match(/^\/products\/\d+\/reviews$/)&&method==='GET'){
      const id=path.split('/')[2];
      const rv=await sbGet('reviews',`product_id=eq.${id}&order=created_at.desc`);
      return json({reviews:Array.isArray(rv)?rv:[]}, 200, origin);
    }
    if(path.match(/^\/products\/\d+\/reviews$/)&&method==='POST'){
      const u=await getUser(request); if(!u) return err('请先登录',401, origin);
      const id=path.split('/')[2];
      const b=await request.json();
      if(!b.rating||b.rating<1||b.rating>5) return err('评分1-5', 400, origin);
      const un=await sbGet('users',`id=eq.${u.sub}&select=username`);
      const uname=Array.isArray(un)&&un[0]?un[0].username:'';
      const result=await sbPost('reviews',{product_id:parseInt(id),user_id:u.sub,username:uname,rating:b.rating,content:b.content||''});
      return json({review:Array.isArray(result)?result[0]:result}, 200, origin);
    }
    if(path==='/upload'&&method==='POST'){
        const u=await getUser(request); if(!u) return err('请先登录',401,origin);
        const fd=await request.formData();
        const file=fd.get('file');
        if(!file) return err('未选择文件',400,origin);
        if(file.size>5*1024*1024) return err('文件不能超5MB',400,origin);
        const ext=file.name.split('.').pop()||'jpg';
        const fn=`product_${Date.now()}_${Math.random().toString(36).slice(2,10)}.${ext}`;
        const buf=await file.arrayBuffer();
        const r=await fetch(`${SUPABASE_URL}/storage/v1/object/product-images/${fn}`,{
            method:'POST',
            headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Content-Type':file.type||'application/octet-stream'},
            body:buf
        });
        if(!r.ok) return err('上传失败',500,origin);
        return json({url:`/api/images/${fn}`,filename:fn},200,origin);
    }

    // 图片代理: /api/images/<filename> -> Supabase Storage
    if(path.startsWith('/images/')&&method==='GET'){
        const fn=path.slice(8);
        if(!fn||fn.includes('..')) return err('Invalid filename',400, origin);
        const r=await fetch(`${SUPABASE_URL}/storage/v1/object/product-images/${fn}`,{
            headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`}
        });
        if(!r.ok) return err('Image not found',404, origin);
        const ct=r.headers.get('content-type')||'application/octet-stream';
        const buf=await r.arrayBuffer();
        return new Response(buf,{status:200,headers:{
            'Content-Type':ct,'Cache-Control':'public, max-age=31536000',...getCorsHeaders(origin)
        }});
    }
    
    // Sitemap.xml 生成器
    if(path === '/sitemap.xml' && method === 'GET') {
        const products = await sbGet('products', 'is_active=eq.true&order=created_at.desc');
        const lastmod = new Date().toISOString().split('T')[0];
        
        let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
        sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
        
        // 首页
        sitemap += '  <url>\n';
        sitemap += '    <loc>https://resources.qiyuan.icu/</loc>\n';
        sitemap += '    <lastmod>' + lastmod + '</lastmod>\n';
        sitemap += '    <changefreq>daily</changefreq>\n';
        sitemap += '    <priority>1.0</priority>\n';
        sitemap += '  </url>\n';
        
        // 产品详情页
        if (Array.isArray(products)) {
            products.forEach(p => {
                const productLastmod = p.created_at ? p.created_at.split('T')[0] : lastmod;
                sitemap += '  <url>\n';
                sitemap += '    <loc>https://resources.qiyuan.icu/product.html?id=' + p.id + '</loc>\n';
                sitemap += '    <lastmod>' + productLastmod + '</lastmod>\n';
                sitemap += '    <changefreq>weekly</changefreq>\n';
                sitemap += '    <priority>0.8</priority>\n';
                sitemap += '  </url>\n';
            });
        }
        
        sitemap += '</urlset>';
        
        const headers = {
            'Content-Type': 'application/xml',
            'Cache-Control': 'public, max-age=3600',
            ...getCorsHeaders(origin)
        };
        return new Response(sitemap, { status: 200, headers });
    }

    return err('Not found',404, origin);
  } catch(e) { 
    console.error('API Error:', e);
    return err('服务器内部错误: ' + (e.message || '未知错误'),500, origin); 
  }
}
