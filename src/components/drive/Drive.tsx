import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from '@hooks/useTranslation';
import { Icon } from '@iconify/react';
import { Button } from '@components/ui/button';
import FilePreviewModal, { type DriveFile } from './FilePreviewModal';

function formatBytes(n: number): string {
  if (!n) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(u.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  return `${(n / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${u[i]}`;
}

/** 距过期剩余时间，紧凑格式：23h 59m / 45m / 30s（已过期返回空串） */
function formatRemaining(expiresAt: string | undefined, now: number): string {
  if (!expiresAt) return '';
  const ms = new Date(expiresAt).getTime() - now;
  if (ms <= 0) return '';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

/** XHR 上传以获取进度（fetch 不支持上传进度回调） */
function putWithProgress(url: string, file: File, onProgress: (p: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url, true);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`上传失败 ${xhr.status}`)));
    xhr.onerror = () => reject(new Error('NETWORK_ERROR'));
    xhr.send(file);
  });
}

export default function Drive() {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [copied, setCopied] = useState('');
  const [preview, setPreview] = useState<DriveFile | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const loadList = useCallback(async () => {
    try {
      const r = await fetch('/api/drive/list');
      const j = await r.json();
      if (j?.files) setFiles(j.files);
    } catch {
      /* 忽略 */
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  // 每 30s 刷新一次"剩余时间"
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const onUpload = useCallback(async () => {
    setError('');
    if (!file) return;
    setUploading(true);
    setProgress(0);
    try {
      // ① 取 presigned 上传地址
      const initR = await fetch('/api/drive/upload-init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          size: file.size,
          contentType: file.type || 'application/octet-stream',
        }),
      });
      const init = await initR.json();
      if (!initR.ok || !init.uploadUrl) throw new Error(init.error || t('drive.errorInit'));
      // ② 浏览器直传 R2（带进度）
      await putWithProgress(init.uploadUrl, file, (p) => setProgress(p));
      // ③ 回填确认
      const doneR = await fetch('/api/drive/upload-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: init.token }),
      });
      const done = await doneR.json();
      if (!doneR.ok) throw new Error(done.error || t('drive.errorConfirm'));
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadList();
    } catch (e: any) {
      const msg: string = e?.message || '';
      setError(msg === 'NETWORK_ERROR' ? t('drive.errorNet') : msg || t('drive.errorUpload'));
    } finally {
      setUploading(false);
    }
  }, [file, loadList]);

  const copyShare = async (f: DriveFile) => {
    try {
      await navigator.clipboard.writeText(f.url);
      setCopied(f.token);
      setTimeout(() => setCopied(''), 1500);
    } catch {
      /* 忽略 */
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 上传区 */}
      <div className="bg-card border-border rounded-lg border p-4 md:p-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium">
          <Icon icon="lucide:cloud-upload" className="text-primary h-4 w-4" />
          {t('drive.uploadTitle')}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          className="file:bg-primary file:text-primary-foreground mb-3 w-full cursor-pointer rounded-md border border-dashed p-2 text-sm file:mr-3 file:rounded file:border-0 file:px-3 file:py-1"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        {file && (
          <div className="text-muted-foreground mb-3 text-xs">
            {file.name} · {formatBytes(file.size)}
            {uploading && (
              <span className="text-primary ml-2">
                {t('drive.uploading', { pct: Math.round(progress * 100) })}
              </span>
            )}
            {uploading && (
              <div className="bg-border mt-1 h-1.5 w-full overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full transition-all"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
            )}
          </div>
        )}
        {error && <div className="mb-3 text-sm text-red-500">{error}</div>}
        <Button onClick={onUpload} disabled={!file || uploading} className="w-full md:w-auto">
          <Icon icon="lucide:upload" className="mr-2 h-4 w-4" />
          {uploading ? t('drive.uploadingBtn') : t('drive.uploadBtn')}
        </Button>
      </div>

      {/* 文件列表 */}
      <div className="bg-card border-border rounded-lg border p-4 md:p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Icon icon="lucide:folder-open" className="text-primary h-4 w-4" />
            {t('drive.sharedFiles')}
          </div>
          <button onClick={loadList} className="text-muted-foreground hover:text-primary text-xs">
            {t('drive.refresh')}
          </button>
        </div>
        <div className="text-muted-foreground/80 mb-3 flex flex-wrap items-center gap-1.5 text-xs">
          <Icon icon="lucide:clock" className="h-3.5 w-3.5" />
          {t('drive.autoExpire')}
        </div>
        {files.length === 0 ? (
          <div className="text-muted-foreground py-6 text-center text-sm">{t('drive.empty')}</div>
        ) : (
          <ul className="flex flex-col gap-2">
            {files.map((f) => (
              <li
                key={f.token}
                className="border-border flex flex-col gap-2 rounded-md border px-3 py-2 text-sm md:flex-row md:items-center md:gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{f.filename}</div>
                  <div className="text-muted-foreground text-xs">
                    {formatBytes(f.size)} · {new Date(f.createdAt).toLocaleString()}
                    {f.expiresAt && (
                      <span className="text-amber-500"> · 剩 {formatRemaining(f.expiresAt, now)}</span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1 justify-end">
                  <Button variant="ghost" size="sm" onClick={() => setPreview(f)} aria-label={t('drive.preview')}>
                    <Icon icon="lucide:eye" className="h-4 w-4" />
                  </Button>
                  <a href={`/api/drive/download?token=${f.token}`} download={f.filename} rel="noopener noreferrer">
                    <Button variant="ghost" size="sm">
                      <Icon icon="lucide:download" className="h-4 w-4" />
                    </Button>
                  </a>
                  <Button variant="ghost" size="sm" onClick={() => copyShare(f)}>
                    <Icon icon={copied === f.token ? 'lucide:check' : 'lucide:copy'} className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 在线预览弹窗 */}
      <FilePreviewModal file={preview} onClose={() => setPreview(null)} />
    </div>
  );
}
