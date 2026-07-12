/**
 * Meting API client — resolves music platform URLs to playable audio streams.
 *
 * Ported from Shoka player.js URL parsing + Meting API integration.
 * Supports NetEase Cloud Music and QQ Music.
 */

const DEFAULT_API = 'https://api.i-meto.com/meting/api';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export interface MetingSong {
  name: string;
  artist: string;
  url: string;
  pic: string;
  lrc: string;
}

interface ParsedUrl {
  server: string;
  type: string;
  id: string;
}

// URL parsing rules (ported from Shoka player.js:30-47)
const URL_RULES: [RegExp, string, string][] = [
  [/music\.163\.com.*song.*id=(\d+)/, 'netease', 'song'],
  [/music\.163\.com.*album.*id=(\d+)/, 'netease', 'albumlist'],
  [/music\.163\.com.*playlist.*id=(\d+)/, 'netease', 'playlist'],
  [/music\.163\.com.*discover\/toplist.*id=(\d+)/, 'netease', 'playlist'],
  [/y\.qq\.com.*song\/(\w+)/, 'tencent', 'song'],
  [/y\.qq\.com.*album\/(\w+)/, 'tencent', 'albumlist'],
  [/y\.qq\.com.*playsquare\/(\w+)/, 'tencent', 'playlist'],
  [/y\.qq\.com.*playlist\/(\w+)/, 'tencent', 'playlist'],
];

/** Parse a music platform URL into server/type/id triple. */
export function parseMusicUrl(url: string): ParsedUrl | null {
  for (const [regex, server, type] of URL_RULES) {
    const match = url.match(regex);
    if (match?.[1]) {
      return { server, type, id: match[1] };
    }
  }
  return null;
}

interface CacheEntry {
  data: MetingSong[];
  timestamp: number;
}

function getCacheKey(server: string, type: string, id: string): string {
  return `meting:v5:${server}:${type}:${id}`;
}

function getFromCache(key: string): MetingSong[] | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      localStorage.removeItem(key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

function setCache(key: string, data: MetingSong[]): void {
  try {
    const entry: CacheEntry = { data, timestamp: Date.now() };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // localStorage full or unavailable — non-critical, skip silently
  }
}

function isMetingSong(obj: unknown): obj is MetingSong {
  if (typeof obj !== 'object' || obj === null) return false;
  const o = obj as Record<string, unknown>;
  return typeof o.name === 'string' && typeof o.artist === 'string' && typeof o.url === 'string';
}

async function fetchTencentFromYgking(type: string, id: string): Promise<MetingSong[]> {
  let songsList: any[] = [];
  if (type === 'playlist') {
    const res = await fetch(`https://api.ygking.top/api/playlist?id=${id}`);
    if (!res.ok) throw new Error(`QQ Music Playlist API error: ${res.status}`);
    const json = await res.json();
    songsList = json.data?.songlist || json.data?.songs || [];
  } else if (type === 'albumlist' || type === 'album') {
    const res = await fetch(`https://api.ygking.top/api/album?mid=${id}`);
    if (!res.ok) throw new Error(`QQ Music Album API error: ${res.status}`);
    const json = await res.json();
    songsList = json.data?.songlist || json.data?.songs || [];
  } else if (type === 'song') {
    const res = await fetch(`https://api.ygking.top/api/song/detail?mid=${id}`);
    if (!res.ok) throw new Error(`QQ Music Song API error: ${res.status}`);
    const json = await res.json();
    songsList = json.data?.track_info ? [json.data.track_info] : [];
  }

  if (songsList.length === 0) return [];

  // Extract mids and batch fetch URLs in chunks of 30 to avoid URL length issues
  const mids = songsList.map((s) => s.mid).filter(Boolean);
  const chunkSize = 30;
  const urlPromises: Promise<any>[] = [];

  for (let i = 0; i < mids.length; i += chunkSize) {
    const chunk = mids.slice(i, i + chunkSize);
    urlPromises.push(
      fetch(`https://api.ygking.top/api/song/url?mid=${chunk.join(',')}&quality=320`)
        .then((r) => r.json())
        .then((json) => json.data || {})
        .catch(() => ({}))
    );
  }

  const urlResults = await Promise.all(urlPromises);
  const urlsMap = Object.assign({}, ...urlResults);

  return songsList
    .map((item) => {
      const name = item.title || item.name || '';
      const artist = Array.isArray(item.singer) ? item.singer.map((s: any) => s.name).join('/') : '';
      const url = urlsMap[item.mid] || '';
      const pic = item.album?.mid
        ? `https://y.gtimg.cn/music/photo_new/T002R300x300M000${item.album.mid}.jpg`
        : `https://api.ygking.top/api/song/cover?mid=${item.mid}&size=300`;
      const lrc = `https://api.ygking.top/api/lyric?mid=${item.mid}`;

      return { name, artist, url, pic, lrc };
    })
    .filter((s) => s.name && s.url);
}

/** Fetch songs from Meting API for a single parsed URL. */
export async function fetchMeting(server: string, type: string, id: string, apiUrl?: string): Promise<MetingSong[]> {
  const cacheKey = getCacheKey(server, type, id);
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  if (server === 'tencent') {
    const songs = await fetchTencentFromYgking(type, id);
    if (songs.length > 0) setCache(cacheKey, songs);
    return songs;
  }

  const url = new URL(apiUrl || DEFAULT_API);
  const params = new URLSearchParams({ server, type, id });
  url.search = params.toString();
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Meting API error: ${response.status}`);

  const data: unknown = await response.json();
  if (!Array.isArray(data)) return [];
  
  const songs: MetingSong[] = [];
  for (const item of data) {
    if (typeof item === 'object' && item !== null) {
      const o = item as Record<string, unknown>;
      const name = typeof o.name === 'string' ? o.name : typeof o.title === 'string' ? o.title : '';
      const artist = typeof o.artist === 'string' ? o.artist : typeof o.author === 'string' ? o.author : '';
      const url = typeof o.url === 'string' ? o.url : '';
      const pic = typeof o.pic === 'string' ? o.pic : typeof o.cover === 'string' ? o.cover : '';
      const lrc = typeof o.lrc === 'string' ? o.lrc : '';
      
      if (name && artist && url) {
        songs.push({ name, artist, url, pic, lrc });
      }
    }
  }
  
  if (songs.length > 0) setCache(cacheKey, songs);
  return songs;
}

/** Resolve multiple music URLs into a flat song list. */
export async function resolvePlaylist(urls: string[], apiUrl?: string): Promise<MetingSong[]> {
  const results = await Promise.allSettled(
    urls.map((url) => {
      const parsed = parseMusicUrl(url);
      if (!parsed) return Promise.resolve([]);
      return fetchMeting(parsed.server, parsed.type, parsed.id, apiUrl);
    }),
  );

  return results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
}
