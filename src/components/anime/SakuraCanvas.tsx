import { useEffect, useRef } from 'react';

interface Props {
  /** 花瓣数量（桌面端） */
  intensity?: number;
  /** 花瓣数量（移动端） */
  mobileIntensity?: number;
  /** 下落速度倍率 */
  speed?: number;
  /** 画布 z-index */
  zIndex?: number;
}

interface Petal {
  x: number;
  y: number;
  size: number;
  vy: number;
  vx: number;
  rotation: number;
  rotationSpeed: number;
  swayPhase: number;
  swaySpeed: number;
  swayAmp: number;
  opacity: number;
  hue: number;
}

const MOBILE_BREAKPOINT = 768;

/**
 * 樱花飘落特效 - 轻量纯 Canvas 2D 实现（无 Three.js 依赖）
 * 花瓣带旋转、左右摇曳与风力，尊重 prefers-reduced-motion
 */
export function SakuraCanvas({ intensity = 24, mobileIntensity = 12, speed = 1, zIndex = 40 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let petals: Petal[] = [];
    let rafId = 0;
    let running = true;

    const petalCount = () => (width < MOBILE_BREAKPOINT ? mobileIntensity : intensity);

    const createPetal = (initial = false): Petal => ({
      x: Math.random() * width,
      y: initial ? Math.random() * height : -20,
      size: 5 + Math.random() * 7,
      vy: (0.6 + Math.random() * 1.1) * speed,
      vx: (0.2 + Math.random() * 0.5) * speed,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.04,
      swayPhase: Math.random() * Math.PI * 2,
      swaySpeed: 0.01 + Math.random() * 0.02,
      swayAmp: 0.5 + Math.random() * 1.2,
      opacity: 0.55 + Math.random() * 0.4,
      hue: 335 + Math.random() * 15, // 粉色系
    });

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const drawPetal = (p: Petal) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = p.opacity;
      // 花瓣形状：两段贝塞尔曲线组成的水滴状
      ctx.beginPath();
      ctx.moveTo(0, -p.size);
      ctx.bezierCurveTo(p.size * 0.9, -p.size * 0.5, p.size * 0.7, p.size * 0.6, 0, p.size);
      ctx.bezierCurveTo(-p.size * 0.7, p.size * 0.6, -p.size * 0.9, -p.size * 0.5, 0, -p.size);
      const gradient = ctx.createLinearGradient(0, -p.size, 0, p.size);
      gradient.addColorStop(0, `hsl(${p.hue}, 90%, 88%)`);
      gradient.addColorStop(1, `hsl(${p.hue}, 85%, 76%)`);
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.restore();
    };

    const tick = () => {
      if (!running) return;
      ctx.clearRect(0, 0, width, height);
      for (const p of petals) {
        p.swayPhase += p.swaySpeed;
        p.x += p.vx + Math.sin(p.swayPhase) * p.swayAmp;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        if (p.y > height + 20 || p.x > width + 20) {
          Object.assign(p, createPetal());
        }
        drawPetal(p);
      }
      rafId = requestAnimationFrame(tick);
    };

    const onVisibility = () => {
      running = document.visibilityState === 'visible';
      if (running) {
        rafId = requestAnimationFrame(tick);
      } else {
        cancelAnimationFrame(rafId);
      }
    };

    resize();
    petals = Array.from({ length: petalCount() }, () => createPetal(true));
    rafId = requestAnimationFrame(tick);

    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [intensity, mobileIntensity, speed]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex,
      }}
    />
  );
}

export default SakuraCanvas;
