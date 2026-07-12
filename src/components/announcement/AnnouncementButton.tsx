/**
 * AnnouncementButton Component
 *
 * Prominent announcement button for header.
 * Shows unread badge when there are unread announcements.
 */

import { useIsMounted } from '@hooks/useIsMounted';
import { useTranslation } from '@hooks/useTranslation';
import { Icon } from '@iconify/react';
import { cn } from '@lib/utils';
import { useStore } from '@nanostores/react';
import { activeAnnouncements, openAnnouncementList, unreadCount } from '@store/announcement';
import { AnimatePresence, motion } from 'motion/react';

export default function AnnouncementButton() {
  const { t } = useTranslation();
  const isMounted = useIsMounted();
  const count = useStore(unreadCount);
  const announcements = useStore(activeAnnouncements);

  // Don't render during SSR or if no active announcements
  if (!isMounted || announcements.length === 0) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={openAnnouncementList}
      aria-expanded={false}
      aria-haspopup="dialog"
      className={cn(
        'relative flex items-center gap-1.5 transition-all duration-300',
        'text-white hover:text-white/80',
        'px-2 py-1 rounded-lg',
        'hover:bg-white/10',
      )}
      title={t('announcement.title')}
    >
      <Icon icon="ri:notification-3-line" className="h-5 w-5" />
      <span className="hidden tablet:inline text-sm">{t('announcement.title')}</span>

      {/* Unread badge - only show after mount to avoid hydration mismatch */}
      <AnimatePresence>
        {isMounted && count > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className={cn(
              'absolute -top-1 -right-1',
              'flex items-center justify-center',
              'h-4 min-w-[1rem] px-1',
              'bg-red-500 text-white',
              'rounded-full font-medium text-xs',
            )}
          >
            {count > 9 ? '9+' : count}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
