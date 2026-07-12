import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { Button } from '@components/ui/button';
import { tempMailConfig } from '@/constants/site-config';
import { useTranslation } from '@/hooks/useTranslation';

type Message = {
  id: string;
  from_addr: string;
  subject: string;
  received_at: number;
  raw_size: number;
};

type MessageDetail = Message & { body_html: string | null; body_text: string | null };

const POLL_MS = 5000;
const STORAGE_KEY = 'tm_addr';

/** Locale-aware relative time string (e.g. "刚刚" / "12s ago" / "3分前"). */
function relTime(ms: number, locale: string): string {
  const s = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (s < 5) return locale === 'zh' ? '刚刚' : locale === 'ja' ? 'たった今' : 'just now';
  if (s < 60) return locale === 'zh' ? `${s} 秒前` : locale === 'ja' ? `${s}秒前` : `${s}s ago`;
  const m = Math.floor(s / 60);
  return locale === 'zh' ? `${m} 分钟前` : locale === 'ja' ? `${m}分前` : `${m}m ago`;
}

/**
 * 把邮件 HTML 包进一个完整文档：
 * - <base target="_blank"> 让邮件内所有链接点击时在新标签页打开（noopener 防反向定位）
 * - referrerpolicy=no-referrer 提升外部图片加载成功率、保护隐私
 * - 邮件自带的 <style> 即使在 <body> 内也会被浏览器全局应用，样式正常渲染
 */
function wrapHtml(html: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><base target="_blank" rel="noopener noreferrer"></head><body>${html}</body></html>`;
}

export default function TempMail() {
  const { t, locale } = useTranslation();
  const domains =
    tempMailConfig.domains && tempMailConfig.domains.length
      ? tempMailConfig.domains
      : tempMailConfig.domain
        ? [tempMailConfig.domain]
        : [];
  const [selectedDomain, setSelectedDomain] = useState(domains[0] || '');
  const [addr, setAddr] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [selected, setSelected] = useState<MessageDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastChecked, setLastChecked] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const pollRef = useRef<number | null>(null);

  // 恢复 sessionStorage 中的地址（SSR 阶段不访问 sessionStorage）
  useEffect(() => {
    const a = sessionStorage.getItem(STORAGE_KEY);
    if (a) setAddr(a);
  }, []);

  const stopPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const fetchMessages = useCallback(
    async (a: string, manual = false) => {
      if (manual) setRefreshing(true);
      try {
        const r = await fetch(`/api/temp-mail/messages?addr=${encodeURIComponent(a)}`);
        const d = await r.json();
        if (r.ok && d.messages) setMessages(d.messages);
      } catch (_) {
        /* 轮询失败静默重试 */
      } finally {
        setLastChecked(Date.now());
        if (manual) setRefreshing(false);
      }
    },
    [],
  );

  const startPoll = useCallback(
    (a: string) => {
      stopPoll();
      fetchMessages(a);
      pollRef.current = window.setInterval(() => fetchMessages(a), POLL_MS);
    },
    [stopPoll, fetchMessages],
  );

  // 自动刷新开关 → 启停轮询
  useEffect(() => {
    if (addr && autoRefresh) startPoll(addr);
    else stopPoll();
    return stopPoll;
  }, [addr, autoRefresh, startPoll, stopPoll]);

  // 自动刷新开启时，每秒刷新“上次检查”相对时间
  useEffect(() => {
    if (!autoRefresh || !addr) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [autoRefresh, addr]);

  const genAddress = async () => {
    setError('');
    setLoading(true);
    setSelected(null);
    try {
      const r = await fetch('/api/temp-mail/address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: selectedDomain }),
      });
      const d = await r.json();
      if (!r.ok || !d.addr) throw new Error(d.error || t('tempMail.generate'));
      setAddr(d.addr);
      sessionStorage.setItem(STORAGE_KEY, d.addr);
      setMessages([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('tempMail.generate'));
    } finally {
      setLoading(false);
    }
  };

  const openMessage = async (id: string) => {
    try {
      const r = await fetch(`/api/temp-mail/message?id=${encodeURIComponent(id)}&addr=${encodeURIComponent(addr)}`);
      const d = await r.json();
      if (r.ok && d.message) setSelected(d.message);
    } catch (_) {
      /* noop */
    }
  };

  const copyAddr = async () => {
    try {
      await navigator.clipboard.writeText(addr);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (_) {
      /* noop */
    }
  };

  const reset = () => {
    setAddr('');
    sessionStorage.removeItem(STORAGE_KEY);
    stopPoll();
    setMessages([]);
    setSelected(null);
    setLastChecked(null);
  };

  const toggleAuto = () => setAutoRefresh((v) => !v);

  if (!domains.length) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
        {t('tempMail.notConfigured')}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {!addr ? (
        <div className="mx-auto max-w-xl rounded-lg border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">{t('tempMail.intro')}</p>
          {domains.length > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <label htmlFor="tm-domain" className="text-sm text-muted-foreground">
                {t('tempMail.domain')}
              </label>
              <select
                id="tm-domain"
                value={selectedDomain}
                onChange={(e) => setSelectedDomain(e.target.value)}
                className="rounded-md border border-border bg-background px-2 py-1 text-sm"
              >
                {domains.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="mt-4 flex justify-center">
            <Button variant="gradient-shoka" onClick={genAddress} disabled={loading}>
              {loading ? t('tempMail.generating') : t('tempMail.generate')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* 地址条 */}
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 md:flex-row md:items-center">
            <code className="min-w-0 flex-1 break-all text-sm font-medium">{addr}</code>
            <div className="flex shrink-0 gap-2 w-full md:w-auto">
              <Button variant="outline" size="sm" onClick={copyAddr} className="flex-1 md:flex-none">
                {copied ? t('tempMail.copied') : t('tempMail.copy')}
              </Button>
              <Button variant="outline" size="sm" onClick={reset} className="flex-1 md:flex-none">
                {t('tempMail.regenerate')}
              </Button>
            </div>
          </div>

          {/* 收件箱 + 内容：桌面优先——默认两栏，≤992px（手机/平板）折叠为单栏避免拥挤。
              注意本项目 tailwind 断点为桌面优先体系（lg=≤1440 而非 ≥1024），故用基础 grid-cols-2 + tablet:grid-cols-1 */}
          <div className="grid gap-4 grid-cols-2 tablet:grid-cols-1">
            {/* 收件箱区域 */}
            <section className="flex min-h-80 flex-col rounded-lg border border-border bg-card">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
                <span className="text-sm font-medium">{t('tempMail.inbox')} ({messages.length})</span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => fetchMessages(addr, true)}
                    disabled={refreshing}
                    aria-label={t('tempMail.refresh')}
                    title={t('tempMail.refresh')}
                  >
                    <Icon icon="ri:refresh-line" className={refreshing ? 'animate-spin' : ''} />
                  </Button>
                  <Button variant="outline" size="sm" onClick={toggleAuto} title={t('tempMail.autoRefresh')}>
                    <span
                      className={'inline-block size-2 rounded-full ' + (autoRefresh ? 'animate-pulse bg-green-500' : 'bg-gray-300')}
                    />
                    {autoRefresh ? t('tempMail.autoRefreshOn') : t('tempMail.autoRefreshOff')}
                  </Button>
                </div>
              </div>
              {lastChecked && autoRefresh && (
                <div className="border-b border-border bg-muted/40 px-3 py-1 text-[11px] text-muted-foreground">
                  {t('tempMail.lastChecked', { time: relTime(lastChecked, locale) })}
                </div>
              )}
              <ul className="flex-1 divide-y divide-border overflow-auto" style={{ maxHeight: '24rem' }}>
                {messages.length === 0 && (
                  <li className="px-3 py-10 text-center text-sm text-muted-foreground">{t('tempMail.empty')}</li>
                )}
                {messages.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => openMessage(m.id)}
                      className={
                        'w-full px-3 py-2.5 text-left transition-colors hover:bg-muted ' +
                        (selected?.id === m.id ? ' bg-primary/10' : '')
                      }
                    >
                      <div className="truncate text-sm font-medium">{m.subject || t('tempMail.noSubject')}</div>
                      <div className="truncate text-xs text-muted-foreground">{m.from_addr}</div>
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            {/* 邮件内容区域 */}
            <section className="flex min-h-80 flex-col rounded-lg border border-border bg-card">
              <div className="border-b border-border px-3 py-2 text-sm font-medium">{t('tempMail.content')}</div>
              <div className="flex-1 p-3">
                {!selected && <p className="text-sm text-muted-foreground">{t('tempMail.selectToView')}</p>}
                {selected && (
                  <div className="space-y-3">
                    <div className="space-y-1 text-sm">
                      <div>
                        <span className="font-medium">{t('tempMail.from')}：</span>
                        <span className="break-all">{selected.from_addr}</span>
                      </div>
                      <div>
                        <span className="font-medium">{t('tempMail.subject')}：</span>
                        <span className="break-all">{selected.subject || t('tempMail.noSubject')}</span>
                      </div>
                    </div>
                    {selected.body_html ? (
                      <iframe
                        sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                        referrerPolicy="no-referrer"
                        className="h-80 w-full rounded-lg border border-border bg-white"
                        srcDoc={wrapHtml(selected.body_html)}
                      />
                    ) : (
                      <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted p-2 text-xs">
                        {selected.body_text}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      <p className="text-xs text-muted-foreground">{t('tempMail.expiresHint')}</p>
    </div>
  );
}
