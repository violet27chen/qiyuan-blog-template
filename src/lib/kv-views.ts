/**
 * KV 页面访问量统计客户端（EdgeOne Pages KV）
 *
 * 后端接口（edge-functions/api/[[default]].js）：
 * - GET  /api/views?path=/xxx  查询指定页面访问量
 * - GET  /api/views/site       查询全站访问量
 * - POST /api/views {path}     页面访问量 +1（同时累加全站总量）
 */

const API_BASE = '/api/views';
const CACHE_TTL = 60 * 1000; // 与 KV 边缘缓存一致（60s 最终一致）
const REPORTED_PREFIX = 'kv_pv_reported:';

interface CacheEntry {
  value: number;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const pending = new Map<string, Promise<number | null>>();

function normalizePath(input: string): string {
  let p = (input || '/').split('?')[0].split('#')[0];
  if (!p.startsWith('/')) p = `/${p}`;
  p = p.replace(/\/+$/, '') || '/';
  return p;
}

async function fetchViews(url: string): Promise<number | null> {
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  return typeof data?.views === 'number' ? data.views : null;
}

function cached(key: string, fetcher: () => Promise<number | null>): Promise<number | null> {
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return Promise.resolve(hit.value);

  const inflight = pending.get(key);
  if (inflight) return inflight;

  const promise = fetcher()
    .then((value) => {
      if (value !== null) cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL });
      return value;
    })
    .catch((error) => {
      console.error('Failed to fetch KV pageviews:', error);
      return null;
    })
    .finally(() => {
      pending.delete(key);
    });
  pending.set(key, promise);
  return promise;
}

/** 查询指定页面的访问量 */
export function getKvPageviews(path: string): Promise<number | null> {
  const p = normalizePath(path);
  return cached(`page:${p}`, () => fetchViews(`${API_BASE}?path=${encodeURIComponent(p)}`));
}

/** 查询全站访问量 */
export function getKvSiteViews(): Promise<number | null> {
  return cached('site', () => fetchViews(`${API_BASE}/site`));
}

function hasReported(p: string): boolean {
  try {
    return sessionStorage.getItem(`${REPORTED_PREFIX}${p}`) === '1';
  } catch {
    return false;
  }
}

function markReported(p: string): void {
  try {
    sessionStorage.setItem(`${REPORTED_PREFIX}${p}`, '1');
  } catch {
    // ignore (privacy mode etc.)
  }
}

/**
 * 上报一次页面访问（+1）并返回最新访问量。
 * 同一会话（sessionStorage）内同一路径只上报一次，之后退化为查询；
 * 开发环境不上报，避免污染统计数据。
 */
export async function reportKvPageview(path: string): Promise<number | null> {
  const p = normalizePath(path);

  if (import.meta.env.DEV || hasReported(p)) {
    return getKvPageviews(p);
  }

  markReported(p);
  try {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: p }),
    });
    if (!res.ok) return getKvPageviews(p);
    const data = await res.json();
    const views = typeof data?.views === 'number' ? data.views : null;
    if (views !== null) {
      cache.set(`page:${p}`, { value: views, expiresAt: Date.now() + CACHE_TTL });
      if (typeof data?.siteViews === 'number') {
        cache.set('site', { value: data.siteViews, expiresAt: Date.now() + CACHE_TTL });
      }
    }
    return views;
  } catch (error) {
    console.error('Failed to report KV pageview:', error);
    return getKvPageviews(p);
  }
}
