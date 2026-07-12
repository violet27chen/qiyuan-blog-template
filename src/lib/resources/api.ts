import type { ResourceItem } from '@lib/config/types';
import type { ResourceCategoryMeta } from '@lib/resources/categories';
import { normalizeCategoryMeta } from '@lib/resources/categories';

const API_BASE = '/api';

interface ApiProduct {
  id: number;
  name: string;
  description?: string;
  category?: string;
  cloud_type?: string;
  quark_link: string;
  image_url?: string | null;
  thumb_url?: string | null;
  created_at?: string;
  is_active?: boolean;
}

export function normalizeProduct(product: ApiProduct): ResourceItem {
  const category = product.category && product.category !== 'NULL' ? product.category : '其他';
  return {
    id: product.id,
    name: product.name,
    description: product.description || '',
    category,
    cloudType: product.cloud_type || 'quark',
    link: product.quark_link,
    image: product.image_url || product.thumb_url || null,
    createdAt: product.created_at,
  };
}

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function fetchResourceProducts(params?: {
  query?: string;
  category?: string;
  limit?: number;
  ownerUserId?: string;
}): Promise<ResourceItem[]> {
  const search = new URLSearchParams();
  if (params?.query) search.set('q', params.query);
  if (params?.category) search.set('cat', params.category);
  search.set('limit', String(params?.limit ?? 200));
  if (params?.ownerUserId) search.set('uid', params.ownerUserId);

  const data = await parseJson<{ products: ApiProduct[] }>(
    await fetch(`${API_BASE}/products?${search.toString()}`),
  );

  return (data.products ?? [])
    .filter((product) => product.is_active !== false && product.quark_link)
    .map(normalizeProduct);
}

export async function fetchResourceCategories(params?: { ownerUserId?: string }): Promise<ResourceCategoryMeta[]> {
  const search = new URLSearchParams();
  if (params?.ownerUserId) search.set('uid', params.ownerUserId);
  const query = search.toString();
  const data = await parseJson<{ categories: unknown[] }>(
    await fetch(`${API_BASE}/categories${query ? `?${query}` : ''}`),
  );
  return (data.categories ?? [])
    .map(normalizeCategoryMeta)
    .filter((item): item is ResourceCategoryMeta => item !== null);
}

export function resolveResourceImage(image: string | null): string | null {
  if (!image) return null;
  if (image.startsWith('http://') || image.startsWith('https://')) return image;
  return image;
}
