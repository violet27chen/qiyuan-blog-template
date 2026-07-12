/**
 * Resource category labels — loaded from API (/api/categories).
 * Database stores Chinese keys in products.category; translations live in resource_category_i18n.
 */

export interface ResourceCategoryMeta {
  key: string;
  zh: string;
  en: string;
  ja: string;
}

export function buildCategoryLabelMap(categories: ResourceCategoryMeta[]): Record<string, ResourceCategoryMeta> {
  return Object.fromEntries(categories.map((item) => [item.key, item]));
}

export function normalizeCategoryMeta(input: unknown): ResourceCategoryMeta | null {
  if (typeof input === 'string') {
    const key = input.trim();
    if (!key) return null;
    return { key, zh: key, en: key, ja: key };
  }
  if (!input || typeof input !== 'object') return null;
  const row = input as Record<string, unknown>;
  const key = String(row.key ?? '').trim();
  if (!key) return null;
  const zh = String(row.zh ?? key).trim() || key;
  const en = String(row.en ?? zh).trim() || zh;
  const ja = String(row.ja ?? zh).trim() || zh;
  return { key, zh, en, ja };
}

export function getResourceCategoryLabel(
  category: string,
  locale: string,
  labelMap?: Record<string, ResourceCategoryMeta>,
): string {
  const key = category?.trim();
  const meta = key ? labelMap?.[key] : undefined;

  if (!meta) {
    if (locale === 'en') return 'Uncategorized';
    if (locale === 'ja') return '未分類';
    return '未分类';
  }

  if (locale === 'en') return meta.en || meta.zh || 'Uncategorized';
  if (locale === 'ja') return meta.ja || meta.zh || '未分類';
  return meta.zh || '未分类';
}

export function getResourceCategorySearchTerms(
  category: string,
  labelMap?: Record<string, ResourceCategoryMeta>,
): string[] {
  const key = category?.trim() || '其他';
  const meta = labelMap?.[key];
  if (!meta) return [key];
  return [...new Set([key, meta.zh, meta.en, meta.ja].filter(Boolean))];
}
