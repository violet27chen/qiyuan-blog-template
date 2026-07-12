/**
 * Chat scope state — bridges the post page "就这篇文章问 AI" button
 * and the global ChatBot widget.
 *
 * - $chatOpen  : 是否打开聊天面板（由悬浮按钮 / 文章按钮统一驱动）
 * - $chatScope : 当前限定的文章范围（null = 通用模式）
 *               id  = 文章集合 id（= rag_posts.id，边缘函数最可靠的匹配键）
 *               slug = URL slug（展示 / 兜底）
 *               title = 文章标题（展示用）
 */

import { atom } from 'nanostores';

export interface ChatScope {
  id: string;
  slug: string;
  title: string;
}

export const $chatScope = atom<ChatScope | null>(null);
export const $chatOpen = atom<boolean>(false);

/** 打开聊天并限定到某篇文章 */
export function openChatWithScope(scope: ChatScope): void {
  $chatScope.set(scope);
  $chatOpen.set(true);
}

/** 打开通用聊天（不限范围） */
export function openGeneralChat(): void {
  $chatScope.set(null);
  $chatOpen.set(true);
}

/** 关闭聊天面板 */
export function closeChatPanel(): void {
  $chatOpen.set(false);
}

/** 退出文章范围，回到通用聊天（面板保持打开） */
export function clearChatScope(): void {
  $chatScope.set(null);
}
