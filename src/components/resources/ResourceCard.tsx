import { microDampingPreset } from '@constants/anim/spring';
import { useTranslation } from '@hooks/useTranslation';
import type { ResourceItem } from '@lib/config/types';
import type { ResourceCategoryMeta } from '@lib/resources/categories';
import { getResourceCategoryLabel } from '@lib/resources/categories';
import { getCloudLabel } from '@lib/resources/constants';
import { resolveResourceImage } from '@lib/resources/api';
import { motion } from 'motion/react';

interface ResourceCardProps {
  item: ResourceItem;
  index: number;
  downloadLabel: string;
  categoryLabelMap: Record<string, ResourceCategoryMeta>;
}

export default function ResourceCard({ item, index, downloadLabel, categoryLabelMap }: ResourceCardProps) {
  const { locale, t } = useTranslation();
  const imageUrl = resolveResourceImage(item.image);
  const cloudLabel = getCloudLabel(item.cloudType);
  const categoryLabel = getResourceCategoryLabel(item.category, locale, categoryLabelMap);

  return (
    <motion.article
      className="bg-card shadow-card group flex h-full flex-col overflow-hidden rounded-xl ring-1 ring-black/5 dark:ring-white/10"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, ...microDampingPreset }}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={item.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="text-muted-foreground flex h-full w-full items-center justify-center text-sm">{t('resources.noCover')}</div>
        )}
        <span className="bg-primary/90 absolute top-3 right-3 rounded-full px-2.5 py-1 font-medium text-white text-xs shadow-sm">
          {cloudLabel}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 font-bold text-base leading-snug">{item.name}</h3>
          <span className="bg-primary/10 text-primary shrink-0 rounded-full px-2 py-0.5 text-[11px]">
            {categoryLabel}
          </span>
        </div>
        <p className="text-muted-foreground mb-4 line-clamp-3 flex-1 text-sm leading-relaxed">{item.description}</p>
        <a
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-gradient-shoka-button inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 font-medium text-sm text-white transition hover:opacity-90"
        >
          {downloadLabel}
        </a>
      </div>
    </motion.article>
  );
}
