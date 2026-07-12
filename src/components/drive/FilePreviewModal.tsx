import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from '@hooks/useTranslation';
import { Icon } from '@iconify/react';
import { Button } from '@components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@components/ui/dialog';

export type DriveFile = {
  token: string;
  filename: string;
  size: number;
  contentType: string;
  createdAt: string;
  expiresAt?: string;
  url: string;
};

/** 可内联预览的图片扩展名 */
const IMAGE_EXT = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'bmp', 'svg', 'ico', 'heic', 'heif',
]);

/** 浏览器可直接播放的视频扩展名 */
const VIDEO_EXT = new Set(['mp4', 'webm', 'ogv', 'ogg', 'mov', 'm4v']);

/** 浏览器可直接播放的音频扩展名 */
const AUDIO_EXT = new Set(['mp3', 'wav', 'oga', 'ogg', 'flac', 'm4a', 'aac']);

/** 安装包 / 二进制 / 压缩包：无法有意义地预览，只能下载 */
const NO_PREVIEW_EXT = new Set([
  // 安装包 / 可执行
  'exe', 'apk', 'msi', 'dmg', 'deb', 'rpm', 'bin', 'app', 'jar', 'com', 'sys', 'dll', 'so', 'iso', 'img',
  // 压缩包
  'zip', 'rar', '7z', 'gz', 'tar', 'bz2', 'tgz', 'xz', 'zst',
]);

/** 扩展名 → Shiki 语言 id（未列出的一律按纯文本处理） */
const LANG_MAP: Record<string, string> = {
  js: 'javascript', jsx: 'jsx', mjs: 'javascript', cjs: 'javascript',
  ts: 'typescript', tsx: 'tsx',
  py: 'python', rb: 'ruby', php: 'php', go: 'go', rs: 'rust', java: 'java',
  c: 'c', h: 'c', cpp: 'cpp', cc: 'cpp', cxx: 'cpp', hpp: 'cpp', hh: 'cpp',
  cs: 'csharp', kt: 'kotlin', swift: 'swift', scala: 'scala', dart: 'dart', lua: 'lua',
  r: 'r', pl: 'perl', asm: 'assembly', masm: 'assembly',
  html: 'html', htm: 'html', vue: 'vue', svelte: 'svelte', xml: 'xml', svg: 'xml',
  css: 'css', scss: 'scss', less: 'less',
  json: 'json', json5: 'json5', jsonc: 'jsonc',
  yml: 'yaml', yaml: 'yaml', toml: 'toml', ini: 'ini', conf: 'ini', env: 'ini',
  md: 'markdown', mdx: 'markdown', markdown: 'markdown',
  sql: 'sql', sh: 'bash', bash: 'bash', zsh: 'bash', fish: 'bash', ps1: 'powershell',
  dockerfile: 'docker', makefile: 'makefile', cmake: 'cmake',
  proto: 'proto', graphql: 'graphql', gql: 'graphql',
  csv: 'csv', tsv: 'csv', diff: 'diff', patch: 'diff', log: 'text', txt: 'text',
  gitignore: 'text', editorconfig: 'ini',
};

/** 文本 / 代码预览的大小上限（2MB），避免一次拉取过大文件 */
const MAX_TEXT_BYTES = 2 * 1024 * 1024;

type PreviewKind = 'image' | 'video' | 'audio' | 'pdf' | 'text' | 'binary';

function extOf(name: string): string {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i + 1).toLowerCase() : '';
}

function getKind(f: DriveFile): PreviewKind {
  const ext = extOf(f.filename);
  const ct = (f.contentType || '').toLowerCase();
  if (NO_PREVIEW_EXT.has(ext)) return 'binary';
  if (IMAGE_EXT.has(ext) || ct.startsWith('image/')) return 'image';
  if (VIDEO_EXT.has(ext) || ct.startsWith('video/')) return 'video';
  if (AUDIO_EXT.has(ext) || ct.startsWith('audio/')) return 'audio';
  if (ext === 'pdf' || ct === 'application/pdf') return 'pdf';
  const isTextLike =
    ct.startsWith('text/') ||
    ct === 'application/json' ||
    ct === 'application/xml' ||
    ct === 'application/x-yaml' ||
    LANG_MAP[ext] !== undefined;
  return isTextLike ? 'text' : 'binary';
}

/** 用 Shiki 高亮代码；失败回退纯文本转义 */
async function highlightCode(code: string, lang: string): Promise<string> {
  const dark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  try {
    const shiki = await import('shiki');
    return await shiki.codeToHtml(code, {
      lang: lang || 'text',
      theme: dark ? 'github-dark' : 'github-light',
    });
  } catch {
    const esc = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return `<pre class="shiki"><code>${esc}</code></pre>`;
  }
}

function Spinner() {
  return (
    <div className="flex flex-col items-center gap-3 text-muted-foreground">
      <Icon icon="lucide:loader-circle" className="h-8 w-8 animate-spin" />
      <span className="text-sm">加载中…</span>
    </div>
  );
}

function CenteredMsg({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full w-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

export default function FilePreviewModal({
  file,
  onClose,
}: {
  file: DriveFile | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [html, setHtml] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'too-large' | 'error'>('idle');

  const kind = useMemo(() => (file ? getKind(file) : null), [file]);
  const previewUrl = file ? `/api/drive/preview?token=${file.token}` : '';
  const downloadUrl = file ? `/api/drive/download?token=${file.token}` : '';

  // 文本 / 代码：按需拉取并高亮（大小受控）
  useEffect(() => {
    if (!file || kind !== 'text') {
      setHtml('');
      setStatus('idle');
      return;
    }
    if (file.size > MAX_TEXT_BYTES) {
      setHtml('');
      setStatus('too-large');
      return;
    }
    let cancelled = false;
    setStatus('loading');
    setHtml('');
    (async () => {
      try {
        const res = await fetch(previewUrl);
        if (!res.ok) throw new Error('fetch failed');
        const text = await res.text();
        if (cancelled) return;
        const lang = LANG_MAP[extOf(file.filename)] || 'text';
        const out = await highlightCode(text, lang);
        if (cancelled) return;
        setHtml(out);
        setStatus('idle');
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, kind]);

  function renderBody() {
    if (!file || !kind) return null;
    switch (kind) {
      case 'image':
        return (
          <div className="relative h-full w-full">
            <img
              src={previewUrl}
              alt={file.filename}
              className="absolute inset-0 h-full w-full object-contain p-4"
            />
          </div>
        );
      case 'video':
        return (
          <div className="relative h-full w-full">
            <video
              src={previewUrl}
              controls
              className="absolute inset-0 h-full w-full object-contain p-4"
            />
          </div>
        );
      case 'audio':
        return (
          <div className="flex h-full w-full items-center justify-center p-4">
            <audio src={previewUrl} controls className="w-full max-w-xl" />
          </div>
        );
      case 'pdf':
        return <iframe src={previewUrl} title={file.filename} className="h-full w-full border-0" />;
      case 'text':
        if (status === 'too-large') {
          return (
            <CenteredMsg>
              文件过大（&gt;2MB），仅支持预览较小的文本 / 代码文件，请下载后查看。
            </CenteredMsg>
          );
        }
        if (status === 'loading') return <Spinner />;
        if (status === 'error') {
          return <CenteredMsg>预览加载失败，请下载后查看。</CenteredMsg>;
        }
        return (
          <div
            className="h-full w-full overflow-auto p-3 text-sm [&_pre.shiki]:!m-0 [&_pre.shiki]:rounded-md [&_pre.shiki]:text-[13px]"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      case 'binary':
      default:
        return <CenteredMsg>该文件类型无法在线预览，请下载后查看。</CenteredMsg>;
    }
  }

  return (
    <Dialog open={!!file} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent
        className="max-w-[96vw] w-[96vw] max-h-[92vh] h-[92vh] gap-0 overflow-hidden p-0"
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">{file?.filename}</DialogTitle>
        <div className="flex h-full w-full flex-col">
          {/* 顶栏：下载 + 文件名 */}
          <div className="flex shrink-0 items-center gap-3 border-b py-2 pl-4 pr-12">
            <a href={downloadUrl} download={file?.filename} rel="noopener noreferrer">
              <Button variant="ghost" size="sm" aria-label={t('drive.download')}>
                <Icon icon="lucide:download" className="h-4 w-4" />
              </Button>
            </a>
            <div className="min-w-0 flex-1 truncate text-sm font-medium" title={file?.filename}>
              {file?.filename}
            </div>
          </div>
          {/* 内容区 */}
          <div className="relative flex flex-1 flex-col overflow-hidden">{renderBody()}</div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
