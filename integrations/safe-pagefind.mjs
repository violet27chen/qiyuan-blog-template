import pagefind from 'astro-pagefind';

/**
 * Wraps astro-pagefind so CI environments missing the native binary
 * still produce a successful build (search index is skipped with a warning).
 */
export default function safePagefind(options) {
  const integration = pagefind(options);
  const buildDone = integration.hooks['astro:build:done'];

  integration.hooks['astro:build:done'] = async (params) => {
    try {
      await buildDone(params);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      params.logger.warn(`Pagefind indexing skipped: ${message}`);
      params.logger.warn('Search will be unavailable until the pagefind binary can run on this platform.');
    }
  };

  return integration;
}
