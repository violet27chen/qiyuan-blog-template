import { siteConfig } from '@constants/site-config';

type OgImageInput =
  | string
  | {
      src?: string;
    }
  | undefined;

function normalizeImagePath(image: OgImageInput): string | undefined {
  if (!image) return undefined;
  if (typeof image === 'string') return image;
  if (typeof image === 'object' && typeof image.src === 'string') return image.src;
  return undefined;
}

/**
 * Get the OG image URL with proper fallback chain
 * Priority: cover → defaultOgImage → avatar
 *
 * @param cover - Optional post cover image path or Astro image metadata
 * @param site - Site URL for absolute URL generation
 * @returns Absolute URL string or undefined
 */
export function getOgImageUrl(cover: OgImageInput, site: URL | undefined): string | undefined {
  const imagePath = normalizeImagePath(cover) || siteConfig.defaultOgImage || siteConfig.avatar;
  return imagePath && site ? new URL(imagePath, site).href : undefined;
}
