import { useEffect, useRef } from 'react';

interface Props {
  /** 点击时爆出爱心/星星粒子 */
  clickBurst?: boolean;
  /** 鼠标移动时的星光拖尾（仅桌面端） */
  cursorTrail?: boolean;
  /** 画布 z-index */
  zIndex?: number;
}

type Shape = 'heart' | 'star' | 'sparkle';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  rotation: number;
  rotationSpeed: number;
  hue: number;
  shape: Shape;
  gravity: number;
}

// 二次元风格的粉紫蓝色调
const HUES = [340, 350, 200, 260, 280, 45];

/**
 * 交互粒子特效 - 点击爱心/星星爆裂 + 鼠标星光拖尾
 * 共用一个 Canvas，尊重 prefers-reduced-motion，粒子空闲时自动停止渲染
 */
export function InteractiveParticles({ clickBurst = true, cursorTrail = true, zIndex = 60 }: Props) {
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
    let particles: Particle[] = [];
    let rafId = 0;
    let animating = false;
    let lastTrail = 0;
    const isTouch = window.matchMedia('(pointer: coarse)').matches;

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

    const randomHue = () => HUES[Math.floor(Math.random() * HUES.length)];

    const spawnBurst = (x: number, y: number) => {
      const count = 10 + Math.floor(Math.random() * 6);
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
        const power = 1.5 + Math.random() * 2.5;
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * power,
          vy: Math.sin(angle) * power - 1.5,
          size: 4 + Math.random() * 5,
          life: 0,
          maxLife: 50 + Math.random() * 30,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.2,
          hue: randomHue(),
          shape: Math.random() < 0.5 ? 'heart' : 'star',
          gravity: 0.06,
        });
      }
      startLoop();
    };

    const spawnTrail = (x: number, y: number) => {
      particles.push({
        x: x + (Math.random() - 0.5) * 8,
        y: y + (Math.random() - 0.5) * 8,
        vx: (Math.random() - 0.5) * 0.6,
        vy: 0.3 + Math.random() * 0.5,
        size: 2 + Math.random() * 3,
        life: 0,
        maxLife: 30 + Math.random() * 20,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.15,
        hue: randomHue(),
        shape: 'sparkle',
        gravity: 0,
      });
      startLoop();
    };

    const drawHeart = (p: Particle, alpha: number) => {
      const s = p.size;
      ctx.beginPath();
      ctx.moveTo(0, s * 0.35);
      ctx.bezierCurveTo(s, -s * 0.45, s * 0.5, -s * 1.1, 0, -s * 0.35);
      ctx.bezierCurveTo(-s * 0.5, -s * 1.1, -s, -s * 0.45, 0, s * 0.35);
      ctx.fillStyle = `hsla(${p.hue}, 90%, 70%, ${alpha})`;
      ctx.fill();
    };

    const drawStar = (p: Particle, alpha: number) => {
      const spikes = 5;
      const outer = p.size;
      const inner = p.size * 0.45;
      ctx.beginPath();
      for (let i = 0; i < spikes * 2; i++) {
        const r = i % 2 === 0 ? outer : inner;
        const a = (Math.PI * i) / spikes - Math.PI / 2;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fillStyle = `hsla(${p.hue}, 95%, 72%, ${alpha})`;
      ctx.fill();
    };

    const drawSparkle = (p: Particle, alpha: number) => {
      const s = p.size;
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.quadraticCurveTo(s * 0.2, -s * 0.2, s, 0);
      ctx.quadraticCurveTo(s * 0.2, s * 0.2, 0, s);
      ctx.quadraticCurveTo(-s * 0.2, s * 0.2, -s, 0);
      ctx.quadraticCurveTo(-s * 0.2, -s * 0.2, 0, -s);
      ctx.fillStyle = `hsla(${p.hue}, 100%, 80%, ${alpha})`;
      ctx.fill();
    };

    const tick = () => {
      ctx.clearRect(0, 0, width, height);
      particles = particles.filter((p) => p.life < p.maxLife);
      if (particles.length === 0) {
        animating = false;
        return;
      }
      for (const p of particles) {
        p.life++;
        p.vy += p.gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        const alpha = Math.max(0, 1 - p.life / p.maxLife);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        if (p.shape === 'heart') drawHeart(p, alpha);
        else if (p.shape === 'star') drawStar(p, alpha);
        else drawSparkle(p, alpha);
        ctx.restore();
      }
      rafId = requestAnimationFrame(tick);
    };

    const startLoop = () => {
      if (!animating) {
        animating = true;
        rafId = requestAnimationFrame(tick);
      }
    };

    const onClick = (e: MouseEvent) => {
      spawnBurst(e.clientX, e.clientY);
    };

    const onMove = (e: MouseEvent) => {
      const now = performance.now();
      if (now - lastTrail < 50) return; // 节流：约每 50ms 一颗
      lastTrail = now;
      spawnTrail(e.clientX, e.clientY);
    };

    resize();
    window.addEventListener('resize', resize);
    if (clickBurst) window.addEventListener('click', onClick);
    if (cursorTrail && !isTouch) window.addEventListener('mousemove', onMove, { passive: true });

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      if (clickBurst) window.removeEventListener('click', onClick);
      if (cursorTrail && !isTouch) window.removeEventListener('mousemove', onMove);
    };
  }, [clickBurst, cursorTrail]);

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

export default InteractiveParticles;
