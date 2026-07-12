/**
 * SearchDialog Component
 *
 * A search dialog with keyboard navigation for searching blog posts.
 * Integrates with Pagefind for static site search.
 */

import { Dialog, DialogPortal } from '@components/ui/dialog';
import { useIsMounted } from '@hooks/useIsMounted';
import { useEscapeKey, useKeyboardShortcut } from '@hooks/useKeyboardShortcut';
import { useSearchKeyboardNav } from '@hooks/useSearchKeyboardNav';
import { useTranslation } from '@hooks/useTranslation';
import { cn } from '@lib/utils';
import { useStore } from '@nanostores/react';
import { $isSearchOpen, closeModal, openModal } from '@store/modal';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// Icons
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <title>Search</title>
      <path d="M18.031 16.6168L22.3137 20.8995L20.8995 22.3137L16.6168 18.031C15.0769 19.263 13.124 20 11 20C6.032 20 2 15.968 2 11C2 6.032 6.032 2 11 2C15.968 2 20 6.032 20 11C20 13.124 19.263 15.0769 18.031 16.6168ZM16.0247 15.8748C17.2475 14.6146 18 12.8956 18 11C18 7.1325 14.8675 4 11 4C7.1325 4 4 7.1325 4 11C4 14.8675 7.1325 18 11 18C12.8956 18 14.6146 17.2475 15.8748 16.0247L16.0247 15.8748Z" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <title>Close</title>
      <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" />
    </svg>
  );
}

// 语义搜索面板：向量召回 + 重排，调用 /api/search，输入防抖、结果可键盘导航。
function SemanticSearch() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ id: string; title: string; url: string; snippet: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setDone(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ctl = new AbortController();
    const id = setTimeout(async () => {
      try {
        const resp = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: q }),
          signal: ctl.signal,
        });
        const data = await resp.json().catch(() => null);
        setResults(Array.isArray(data?.results) ? data.results : []);
        setDone(true);
      } catch {
        setResults([]);
        setDone(true);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      clearTimeout(id);
      ctl.abort();
    };
  }, [query]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[active]) {
      window.location.href = results[active].url;
    }
  };

  return (
    <div className="flex flex-col">
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
        }}
        onKeyDown={onKeyDown}
        placeholder={t('search.semanticPlaceholder')}
        className="w-full rounded-lg border border-border bg-muted px-4 py-3 text-sm text-foreground outline-none transition-colors focus:ring-2 focus:ring-ring"
      />
      <div className="mt-4 min-h-[40vh] space-y-3">
        {loading && (
          <div className="flex items-center gap-2 px-1 text-sm text-muted-foreground">
            <span className="inline-flex gap-1">
              <span className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:0ms]" />
              <span className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:150ms]" />
              <span className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:300ms]" />
            </span>
            {t('search.searching', { SEARCH_TERM: query })}
          </div>
        )}
        {!loading && done && results.length === 0 && (
          <p className="px-1 text-sm text-muted-foreground">{t('search.semanticEmpty')}</p>
        )}
        {results.map((r, i) => (
          <a
            key={r.id}
            href={r.url}
            onClick={closeModal}
            onMouseEnter={() => setActive(i)}
            className={cn(
              'block rounded-lg border border-border px-4 py-3 transition-colors',
              i === active ? 'bg-muted ring-1 ring-ring' : 'hover:bg-muted',
            )}
          >
            <div className="text-sm font-medium text-foreground">{r.title}</div>
            {r.snippet && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{r.snippet}</p>}
          </a>
        ))}
      </div>
    </div>
  );
}

export default function SearchDialog() {
  const { t } = useTranslation();
  const isOpen = useStore($isSearchOpen);
  const { containerRef } = useSearchKeyboardNav(isOpen);
  const [mode, setMode] = useState<'keyword' | 'semantic'>('keyword');

  // Cmd/Ctrl + K to open
  useKeyboardShortcut({
    key: 'k',
    modifiers: ['meta'],
    handler: () => openModal('search'),
  });

  // ESC to close
  useEscapeKey(() => {
    if (isOpen) closeModal();
  }, isOpen);

  // Dispatch events for search component portal
  useEffect(() => {
    if (isOpen) {
      window.dispatchEvent(new CustomEvent('search-dialog-open'));
      // Focus search input after animation
      setTimeout(() => {
        const searchInput = document.querySelector('.pagefind-ui__search-input') as HTMLInputElement;
        searchInput?.focus();
      }, 150);
    } else {
      window.dispatchEvent(new CustomEvent('search-dialog-close'));
    }
  }, [isOpen]);

  // Close before page navigation
  useEffect(() => {
    const handleBeforePreparation = () => closeModal();

    document.addEventListener('astro:before-preparation', handleBeforePreparation);
    return () => {
      document.removeEventListener('astro:before-preparation', handleBeforePreparation);
    };
  }, []);

  const handleBackgroundClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeModal()}>
      <DialogPortal forceMount>
        <AnimatePresence>
          {isOpen && (
            <>
              {/* Overlay */}
              <motion.div
                className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />

              {/* Dialog */}
              <motion.div
                className="fixed inset-0 z-50 grid place-items-center px-4"
                onClick={handleBackgroundClick}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <motion.div
                  className="w-full max-w-3xl overflow-auto rounded-xl bg-gradient-start text-foreground shadow-box"
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="relative p-6 md:p-3">
                    <div className="search-dialog">
                      {/* Header */}
                      <div className="relative mb-3 flex items-center justify-between">
                        <h2 className="flex items-center gap-2 font-semibold text-lg md:text-base">
                          <SearchIcon className="size-5 md:size-4" />
                          {t('search.dialogTitle')}
                        </h2>
                        <button
                          type="button"
                          onClick={closeModal}
                          className="flex size-8 items-center justify-center rounded-full bg-black/5 transition-colors duration-300 hover:bg-black/10 md:size-7 dark:bg-white/10 dark:hover:bg-white/20"
                          aria-label={t('search.dialogClose')}
                        >
                          <CloseIcon className="size-5 md:size-4" />
                        </button>
                      </div>

                      {/* 模式切换：关键词(Pagefind) / 语义(向量) */}
                      <div className="mb-4 flex gap-2">
                        <button
                          type="button"
                          onClick={() => setMode('keyword')}
                          className={cn(
                            'rounded-full px-3 py-1 text-xs transition-colors',
                            mode === 'keyword' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground',
                          )}
                        >
                          {t('search.modeKeyword')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setMode('semantic')}
                          className={cn(
                            'rounded-full px-3 py-1 text-xs transition-colors',
                            mode === 'semantic' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground',
                          )}
                        >
                          {t('search.modeSemantic')}
                        </button>
                      </div>

                      {/* 关键词模式：Pagefind 静态搜索 */}
                      <div className={mode === 'keyword' ? '' : 'hidden'}>
                        <div
                          id="search-empty-hint"
                          className={cn(
                            'search-empty-hint absolute inset-x-0 top-40 text-center text-sm opacity-60 md:top-36',
                            mode !== 'keyword' && 'hidden',
                          )}
                        >
                          <p>{t('search.dialogHint')}</p>
                          <p className="mt-1 text-xs">
                            <kbd className="kbd">ESC</kbd> {t('search.dialogClose')}
                          </p>
                        </div>
                        <div className="vertical-scrollbar scroll-feather-mask -mx-6 h-[calc(80dvh-180px)] overflow-auto scroll-smooth px-6 pb-8 after:bottom-10 md:-mx-3 md:h-[calc(80dvh-160px)] md:px-3">
                          <div id="search-dialog-container" ref={containerRef} />
                        </div>
                      </div>

                      {/* 语义模式：向量语义检索 */}
                      {mode === 'semantic' && <SemanticSearch />}
                    </div>

                    {/* Keyboard hints */}
                    <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-center gap-4 bg-gradient-start px-4 pt-1 pb-4 text-black/50 text-xs dark:border-white/10 dark:text-white/50">
                      <span>
                        <kbd className="kbd">↑↓</kbd> {t('search.dialogSelect')}
                      </span>
                      <span>
                        <kbd className="kbd">Enter</kbd> {t('search.dialogOpen')}
                      </span>
                      <span>
                        <kbd className="kbd">ESC</kbd> {t('search.dialogClose')}
                      </span>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </DialogPortal>
    </Dialog>
  );
}

/**
 * Search trigger button component
 */
export function SearchTrigger({ className }: { className?: string }) {
  const isMounted = useIsMounted();
  const { t } = useTranslation();

  // Only compute platform-specific shortcut after mount to avoid hydration mismatch
  const title = useMemo(() => {
    if (!isMounted) return undefined;
    const platform = navigator.userAgentData?.platform || navigator.userAgent;
    const isMac = /mac/i.test(platform);
    return t('search.searchShortcut', { shortcut: isMac ? '⌘K' : 'Ctrl+K' });
  }, [isMounted, t]);

  return (
    <button
      type="button"
      onClick={() => openModal('search')}
      className={cn('cursor-pointer transition duration-300 hover:scale-125', className)}
      aria-label={t('common.search')}
      title={title}
    >
      <SearchIcon className="size-8" />
    </button>
  );
}
