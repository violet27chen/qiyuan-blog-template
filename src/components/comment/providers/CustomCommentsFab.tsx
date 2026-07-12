import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '@nanostores/react';
import CustomComments from './CustomComments';
import { $chatOpen } from '@store/chat';

// 评论悬浮按钮 + 模态框。仅作为 Fixed 元素挂载到 body，避免被祖先 transform/overflow 影响。
// 仅在文章页（Comment.astro 以 custom provider 渲染本组件）出现。
export default function CustomCommentsFab({ slug }: { slug: string }) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  // 与 AI 聊天面板联动：聊天打开时隐藏评论悬浮按钮，避免移动端全屏聊天盖住时
  // 评论按钮（z-60）浮在聊天输入/发送按钮上方挡住操作。评论模态框本身不受影响。
  const chatOpen = useStore($chatOpen);

  useEffect(() => setMounted(true), []);

  // 拉取评论数用于角标（仅在首次挂载时取一次；打开模态框后由面板自身刷新）
  useEffect(() => {
    if (!slug) return;
    fetch(`/api/comments?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((d) => setCount(Array.isArray(d.comments) ? d.comments.length : 0))
      .catch(() => setCount(0));
  }, [slug]);

  const close = useCallback(() => setOpen(false), []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // 打开时锁定背景滚动
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // 客户端挂载后再渲染，避免 SSR/CSR 水合不匹配
  if (!mounted) return null;

  return createPortal(
    <>
      {!chatOpen && (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="打开评论"
        className="fixed bottom-6 right-6 z-[60] flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-lg shadow-black/20 transition-transform hover:scale-105 active:scale-95 sm:right-auto sm:left-6"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="1.25em"
          height="1.25em"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
        <span>评论</span>
        {count !== null && count > 0 && (
          <span className="ml-0.5 rounded-full bg-background px-1.5 py-0.5 text-xs font-semibold text-foreground">
            {count}
          </span>
        )}
      </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
          onClick={close}
        >
          <div
            className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-2xl bg-background shadow-xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="text-base font-semibold">{count !== null ? `评论 (${count})` : '评论'}</h3>
              <button
                type="button"
                onClick={close}
                aria-label="关闭"
                className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="1.25em"
                  height="1.25em"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <CustomComments slug={slug} />
            </div>
          </div>
        </div>
      )}
    </>,
    document.body,
  );
}
