/**
 * Announcement System Types
 *
 * Types for the backend-less site announcement system.
 * Supports time-based visibility control and priority ordering.
 */

/** Multi-language string type */
export interface LocalizedString {
  zh?: string;
  en?: string;
  ja?: string;
}

export interface Announcement {
  /** Unique identifier for the announcement */
  id: string;

  /** Title of the announcement (multi-language) */
  title: string | LocalizedString;

  /** Main content (plain text, multi-language) */
  content: string | LocalizedString;

  /** Announcement type for styling */
  type?: 'info' | 'warning' | 'success' | 'important';

  /** Publish date for display (ISO 8601 string). Defaults to startDate if not set */
  publishDate?: string;

  /** Start date (ISO 8601 string). If omitted, effective immediately */
  startDate?: string;

  /** End date (ISO 8601 string). If omitted, never expires */
  endDate?: string;

  /** Priority (higher = shown first). Default: 0 */
  priority?: number;

  /** Optional link for "Learn more" action (multi-language) */
  link?: {
    url: string;
    text?: string | LocalizedString;
    external?: boolean;
  };

  /** Custom color (CSS color value, e.g., '#FF6B6B'). Overrides type color */
  color?: string;
}
