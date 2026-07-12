import { ErrorBoundary, ErrorFallback } from '@components/common';
import { useResourcesData } from '@hooks/useResourcesData';
import { useTranslation } from '@hooks/useTranslation';
import { Icon } from '@iconify/react';
import { getResourceCategoryLabel, getResourceCategorySearchTerms, buildCategoryLabelMap } from '@lib/resources/categories';
import { cn } from '@lib/utils';
import { useMemo, useState } from 'react';
import ResourceCard from './ResourceCard';

interface ResourcesCollectionProps {
  ownerUserId?: string;
}

export default function ResourcesCollection({ ownerUserId }: ResourcesCollectionProps) {
  const { t, locale } = useTranslation();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const { products, categories, isLoading, error, retry } = useResourcesData(ownerUserId);
  const categoryLabelMap = useMemo(() => buildCategoryLabelMap(categories), [categories]);

  const filteredProducts = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory = activeCategory === 'all' || product.category === activeCategory;
      if (!matchesCategory) return false;
      if (!keyword) return true;
      const categoryTerms = getResourceCategorySearchTerms(product.category, categoryLabelMap);
      return (
        product.name.toLowerCase().includes(keyword) ||
        product.description.toLowerCase().includes(keyword) ||
        categoryTerms.some((term) => term.toLowerCase().includes(keyword))
      );
    });
  }, [products, query, activeCategory, categoryLabelMap]);

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <div className="w-full">
        <p className="text-muted-foreground mb-6 text-sm leading-relaxed">{t('resources.intro')}</p>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <label className="relative flex-1">
            <Icon icon="ri:search-line" className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 text-lg" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('resources.searchPlaceholder')}
              className="border-input bg-background focus:ring-primary/20 w-full rounded-xl border py-2.5 pr-4 pl-10 text-sm outline-none focus:ring-2"
            />
          </label>
          {(query || activeCategory !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setActiveCategory('all');
              }}
              className="border-input hover:bg-muted rounded-xl border px-4 py-2.5 text-sm transition"
            >
              {t('resources.clearFilters')}
            </button>
          )}
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-sm transition',
              activeCategory === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground',
            )}
          >
            {t('resources.allCategories')}
          </button>
          {categories.map((category) => (
            <button
              key={category.key}
              type="button"
              onClick={() => setActiveCategory(category.key)}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-sm transition',
                activeCategory === category.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground',
              )}
            >
              {getResourceCategoryLabel(category.key, locale, categoryLabelMap)}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="text-muted-foreground flex min-h-[240px] items-center justify-center gap-2 text-sm">
            <Icon icon="ri:loader-4-line" className="animate-spin text-lg" />
            {t('resources.loading')}
          </div>
        ) : error ? (
          <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-8 text-center">
            <p className="text-muted-foreground text-sm">{t('resources.error')}</p>
            <button
              type="button"
              onClick={() => void retry()}
              className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm"
            >
              {t('resources.retry')}
            </button>
          </div>
        ) : (
          <>
            <p className="text-muted-foreground mb-4 text-xs">
              {t('resources.resultCount', { count: filteredProducts.length })}
            </p>

            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-3 gap-5 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
                {filteredProducts.map((item, index) => (
                  <ResourceCard
                    key={item.id}
                    item={item}
                    index={index}
                    downloadLabel={t('resources.download')}
                    categoryLabelMap={categoryLabelMap}
                  />
                ))}
              </div>
            ) : (
              <div className="flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center">
                <Icon icon="ri:inbox-2-line" className="text-muted-foreground mb-3 text-4xl" />
                <p className="font-medium">{t('resources.empty')}</p>
              </div>
            )}
          </>
        )}
      </div>
    </ErrorBoundary>
  );
}
