import { useState } from 'react';
import { useTranslation } from '@hooks/useTranslation';
import { Icon } from '@iconify/react';
import { Button } from '@components/ui/button';

type ShortenResult = {
  slug: string;
  shortUrl: string;
  url: string;
};

export default function Shorten() {
  const { t } = useTranslation();
  const [url, setUrl] = useState('');
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ShortenResult | null>(null);
  const [copied, setCopied] = useState(false);

  const onSubmit = async () => {
    setError('');
    setResult(null);
    const target = url.trim();
    if (!target) {
      setError(t('shorten.urlRequired'));
      return;
    }
    setLoading(true);
    try {
      const r = await fetch('/api/shorten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: target, slug: slug.trim() || undefined }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || t('shorten.errorGeneric'));
      setResult(j as ShortenResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.shortUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 忽略 */
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-row gap-2 md:flex-col">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={t('shorten.urlPlaceholder')}
          className="border-border bg-card text-foreground w-full flex-1 rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <Button onClick={onSubmit} disabled={loading} className="w-auto md:w-full">
          {loading ? t('shorten.generating') : t('shorten.generate')}
        </Button>
      </div>

      <input
        type="text"
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
        placeholder={t('shorten.slugPlaceholder')}
        className="border-border bg-card text-foreground w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />

      {error && <p className="text-sm text-red-500">{error}</p>}

      {result && (
        <div className="flex flex-row items-center gap-2 rounded-md border border-border bg-card p-3 md:flex-col md:items-stretch">
          <code className="min-w-0 flex-1 break-all text-sm">{result.shortUrl}</code>
          <Button variant="outline" size="sm" onClick={copy} className="w-auto md:w-full">
            <Icon icon={copied ? 'lucide:check' : 'lucide:copy'} className="mr-1 h-4 w-4" />
            {copied ? t('shorten.copied') : t('common.copy')}
          </Button>
        </div>
      )}

      {result && (
        <p className="text-xs break-all text-muted-foreground">→ {result.url}</p>
      )}
    </div>
  );
}
