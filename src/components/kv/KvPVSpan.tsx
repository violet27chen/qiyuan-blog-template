import { getKvPageviews, getKvSiteViews, reportKvPageview } from '@lib/kv-views';
import { formatCompactNumber } from '@lib/utils';
import { useEffect, useState } from 'react';

interface Props {
  /** 'page' → 单页访问量；'site' → 全站总访问量 */
  mode?: 'page' | 'site';
  /** 页面路径（mode='page' 时使用） */
  path?: string;
  /** 是否在本次渲染时上报一次访问（+1）。通常只在文章详情页开启 */
  report?: boolean;
  /** 是否使用紧凑数字格式（如 1.2k） */
  compact?: boolean;
}

export default function KvPVSpan({ mode = 'page', path = '/', report = false, compact = true }: Props) {
  const [views, setViews] = useState<number | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    const task =
      mode === 'site'
        ? getKvSiteViews()
        : report
          ? reportKvPageview(path)
          : getKvPageviews(path);

    task
      .then((v) => {
        if (!cancelled) setViews(v);
      })
      .catch(() => {
        if (!cancelled) setViews(null);
      });

    return () => {
      cancelled = true;
    };
  }, [mode, path, report]);

  if (views === undefined) return <span>...</span>;
  if (views === null) return <span>0</span>;
  const display = compact ? formatCompactNumber(views) : views.toString();
  return <span title={views.toLocaleString()}>{display}</span>;
}
