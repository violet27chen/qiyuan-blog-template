/**
 * Announcement i18n utilities
 *
 * Helper functions for resolving localized strings from announcements.
 */

import type { LocalizedString } from '@/types/announcement';

/**
 * Resolve a localized string to the current locale.
 *
 * @param value - Either a plain string or a LocalizedString object
 * @param locale - Target locale (e.g., 'zh', 'en', 'ja')
 * @returns The resolved string for the locale, or fallback to zh or first available
 */
export function resolveLocalizedString(
  value: string | LocalizedString | undefined,
  locale: string
): string {
  if (!value) return '';
  if (typeof value === 'string') return value;

  // Try exact locale match first
  if (value[locale as keyof LocalizedString]) {
    return value[locale as keyof LocalizedString] as string;
  }

  // Fallback to default locale (zh)
  if (value.zh) return value.zh;

  // Fallback to first available language
  const firstAvailable = Object.values(value).find((v) => v !== undefined) as string | undefined;
  return firstAvailable ?? '';
}
