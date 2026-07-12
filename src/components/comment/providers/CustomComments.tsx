import { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTranslation } from '@hooks/useTranslation';

interface CommentItem {
  id: string;
  parent_id: string | null;
  content: string;
  status: string;
  created_at: string;
}

// 上传前在浏览器端把大图压缩/缩放，避免原图（手机照片常 2-5MB）直接存 R2 导致加载慢。
// 仅对位图(jpg/png/webp)处理；GIF 跳过（canvas 会丢动画）；压缩后若反而更大则退回原图。
async function compressCommentImage(
  file: File,
  maxDim = 1600,
  quality = 0.82,
): Promise<{ blob: Blob; type: string }> {
  if (file.type === 'image/gif' || !file.type.startsWith('image/')) {
    return { blob: file, type: file.type || 'application/octet-stream' };
  }
  try {
    const url = URL.createObjectURL(file);
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('decode'));
      img.src = url;
    });
    URL.revokeObjectURL(url);
    let { width, height } = img;
    if (width > maxDim || height > maxDim) {
      const scale = Math.min(maxDim / width, maxDim / height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return { blob: file, type: file.type };
    ctx.drawImage(img, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality),
    );
    if (!blob) return { blob: file, type: file.type };
    // 压缩后反而更大（极小图）则退回原图
    if (blob.size >= file.size) return { blob: file, type: file.type };
    return { blob, type: 'image/jpeg' };
  } catch {
    return { blob: file, type: file.type || 'application/octet-stream' };
  }
}

export default function CustomComments({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/comments?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((d) => setComments(Array.isArray(d.comments) ? d.comments : []))
      .catch(() => setComments([]))
      .finally(() => setLoading(false));
  }, [slug]);

  // 在光标处插入文本（用于粘贴/选择图片后嵌入图片 Markdown）
  const insertAtCursor = useCallback(
    (text: string) => {
      const ta = taRef.current;
      if (!ta) {
        setContent((c) => c + text);
        return;
      }
      const start = ta.selectionStart ?? content.length;
      const end = ta.selectionEnd ?? content.length;
      const next = content.slice(0, start) + text + content.slice(end);
      setContent(next);
      requestAnimationFrame(() => {
        ta.focus();
        const pos = start + text.length;
        ta.setSelectionRange(pos, pos);
      });
    },
    [content],
  );

  const uploadImage = useCallback(
    async (file: File) => {
      setUploading(true);
      setError('');
      try {
        const { blob, type } = await compressCommentImage(file);
        const res = await fetch('/api/comment-image', {
          method: 'POST',
          headers: { 'Content-Type': type },
          body: blob,
        });
        const d = await res.json();
        if (!res.ok || !d.url) throw new Error(d.error || t('comment.uploadFailed'));
        insertAtCursor(`\n![${(file.name || 'image').replace(/[\[\]]/g, '')}](${d.url})\n`);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg || t('comment.uploadFailed'));
      } finally {
        setUploading(false);
      }
    },
    [insertAtCursor, t],
  );

  const onPaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const it of items) {
        if (it.type.startsWith('image/')) {
          const file = it.getAsFile();
          if (file) {
            e.preventDefault();
            uploadImage(file);
            break;
          }
        }
      }
    },
    [uploadImage],
  );

  const onFilePick = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) uploadImage(file);
      e.target.value = '';
    },
    [uploadImage],
  );

  const submit = useCallback(async () => {
    if (!content.trim()) {
      setError(t('comment.emptyContent'));
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, content }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || t('comment.submitFailed'));
      if (d.comment) setComments((c) => [...c, d.comment as CommentItem]);
      setContent('');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || t('comment.submitFailed'));
    } finally {
      setSubmitting(false);
    }
  }, [content, slug, t]);

  return (
    <div className="custom-comments w-full">
      <p className="text-muted-foreground mb-4 text-center text-sm">{t('comment.prompt')}</p>

      {/* 评论列表 */}
      <div className="mb-6 space-y-4">
        {loading ? (
          <p className="text-center text-sm opacity-60">{t('comment.loading')}</p>
        ) : comments.length === 0 ? (
          <p className="text-center text-sm opacity-60">{t('comment.empty')}</p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="rounded-lg border border-border bg-card p-3">
              <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{t('comment.anonymous')}</span>
                <span>{new Date(c.created_at).toLocaleString()}</span>
              </div>
              <div className="prose prose-sm dark:prose-invert max-w-none break-words">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    img: ({ alt, src, title, width, height }) => (
                      <img
                        src={src}
                        alt={alt ?? ''}
                        title={title}
                        width={width}
                        height={height}
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        className="my-2 h-auto max-w-full rounded-lg"
                      />
                    ),
                  }}
                >
                  {c.content}
                </ReactMarkdown>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 评论框 */}
      <div className="rounded-lg border border-border bg-card p-3">
        <textarea
          ref={taRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onPaste={onPaste}
          placeholder={t('comment.placeholder')}
          rows={4}
          className="w-full resize-y rounded border border-border bg-background px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-primary"
        />
        {/* 蜜罐：人类不可见，机器人可能填 */}
        <input type="text" name="hp" tabIndex={-1} autoComplete="off" className="hidden" />
        <div className="mt-2 flex items-center justify-between gap-2">
          <label className="inline-flex cursor-pointer items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary">
            <input type="file" accept="image/*" className="hidden" onChange={onFilePick} />
            <span>{uploading ? t('comment.uploading') : `🖼 ${t('comment.image')}`}</span>
          </label>
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="rounded bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {submitting ? t('comment.posting') : t('comment.submit')}
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      </div>
      <p className="mt-2 text-center text-xs opacity-50">{t('comment.poweredBy')}</p>
    </div>
  );
}
