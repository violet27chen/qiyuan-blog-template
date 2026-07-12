/**
 * AudioPlayer — 文章朗读播放器
 *
 * 播放构建时由 Edge TTS 预生成、存于 R2/本地的 mp3（走 CDN）。
 * 极简单行：播放/暂停 + 进度条（可拖动定位）+ 时间 + 倍速切换。
 * 采用站点设计系统（foreground/5 容器、primary 强调色、react-icons/ri）。
 */

import { useTranslation } from '@hooks/useTranslation';
import { cn } from '@lib/utils';
import { useCallback, useEffect, useRef, useState } from 'react';
import { RiPauseFill, RiPlayFill, RiVolumeUpLine } from 'react-icons/ri';

const SPEEDS = [1, 1.25, 1.5, 2] as const;

function fmt(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export interface AudioPlayerProps {
  src: string;
  className?: string;
}

export default function AudioPlayer({ src, className }: AudioPlayerProps) {
  const { t } = useTranslation();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speedIdx, setSpeedIdx] = useState(0);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => setCurrent(el.currentTime);
    const onMeta = () => {
      setDuration(el.duration);
      setReady(true);
    };
    const onEnd = () => setPlaying(false);
    // 播放状态由真实事件驱动，避免与 play() 的异步结果不同步
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onError = () => {
      setFailed(true);
      setPlaying(false);
    };
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('loadedmetadata', onMeta);
    el.addEventListener('durationchange', onMeta);
    el.addEventListener('ended', onEnd);
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);
    el.addEventListener('error', onError);
    // 主动触发预加载（preload="auto" 已声明，这里再兜底确保开始拉取）
    el.load();
    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('loadedmetadata', onMeta);
      el.removeEventListener('durationchange', onMeta);
      el.removeEventListener('ended', onEnd);
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
      el.removeEventListener('error', onError);
    };
  }, []);

  const toggle = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      // play() 返回 Promise，必须 catch，否则源未就绪/加载失败时抛未捕获的 NotSupportedError
      const p = el.play();
      if (p && typeof p.catch === 'function') {
        p.catch(() => {
          // 再尝试重新加载一次后失败则标记
          try {
            el.load();
          } catch {
            /* noop */
          }
          setPlaying(false);
        });
      }
    } else {
      el.pause();
    }
  }, []);

  const seek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const el = audioRef.current;
    if (!el) return;
    const v = Number(e.target.value);
    el.currentTime = v;
    setCurrent(v);
  }, []);

  const cycleSpeed = useCallback(() => {
    const next = (speedIdx + 1) % SPEEDS.length;
    setSpeedIdx(next);
    if (audioRef.current) audioRef.current.playbackRate = SPEEDS[next];
  }, [speedIdx]);

  const pct = duration > 0 ? (current / duration) * 100 : 0;

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg bg-foreground/5 px-3 py-2 md:gap-2 md:px-2.5',
        className,
      )}
    >
      {/* biome-ignore lint/a11y/useMediaCaption: TTS 朗读音频无字幕轨 */}
      <audio ref={audioRef} src={src} preload="auto" />

      {/* 播放 / 暂停 */}
      <button
        type="button"
        onClick={toggle}
        disabled={failed}
        aria-label={playing ? t('audio.pause') : t('audio.play')}
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform duration-200 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
      >
        {playing ? <RiPauseFill className="size-5" /> : <RiPlayFill className="size-5 translate-x-px" />}
      </button>

      {/* 标签 + 进度 */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
          <RiVolumeUpLine className="size-3.5 shrink-0 text-primary" />
          <span className="truncate font-medium">{failed ? t('audio.failed') : t('audio.listen')}</span>
        </div>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={current}
          onChange={seek}
          aria-label={t('audio.seek')}
          className="h-1 w-full cursor-pointer appearance-none rounded-full text-primary outline-none [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-moz-range-thumb]:size-3 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary"
          style={{
            background: `linear-gradient(to right, currentColor ${pct}%, color-mix(in srgb, currentColor 18%, transparent) ${pct}%)`,
          }}
        />
      </div>

      {/* 时间 */}
      <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
        {fmt(current)} / {ready ? fmt(duration) : '--:--'}
      </span>

      {/* 倍速 */}
      <button
        type="button"
        onClick={cycleSpeed}
        aria-label={t('audio.speed')}
        className="shrink-0 rounded-md bg-foreground/5 px-2 py-1 text-muted-foreground text-xs tabular-nums transition-colors hover:bg-foreground/10 hover:text-foreground"
      >
        {SPEEDS[speedIdx]}x
      </button>
    </div>
  );
}
