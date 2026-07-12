import { Icon } from '@iconify/react';
import { openChatWithScope } from '@store/chat';

interface AskArticleButtonProps {
  /** 文章集合 id（= rag_posts.id，边缘函数匹配键） */
  id: string;
  /** URL slug（展示 / 兜底） */
  slug: string;
  /** 文章标题（范围提示用） */
  title: string;
  /** 按钮文案（由 Astro 端按 locale 传入，走 i18n） */
  label: string;
}

/**
 * 「就这篇文章问 AI」按钮：点击后打开全局聊天并限定到当前文章。
 * 主题化样式，跟随浅色 / 深色 / 季节主题。
 */
export default function AskArticleButton({ id, slug, title, label }: AskArticleButtonProps) {
  return (
    <button
      type="button"
      onClick={() => openChatWithScope({ id, slug, title })}
      className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm text-card-foreground shadow-sm transition-colors hover:border-primary hover:text-primary"
      aria-label={label}
    >
      <Icon icon="ri:sparkling-2-line" className="h-4 w-4 text-primary" />
      <span>{label}</span>
    </button>
  );
}
