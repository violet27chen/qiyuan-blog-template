/**
 * StyleEditor — 开发环境专用的「右键样式编辑器」
 *
 * 仅在 `import.meta.env.DEV` 下生效：本地 `astro dev` 运行时**直接定死**右键页面任意元素
 * 即可弹出面板，无需任何开关 / 按钮。可自由编辑：
 *   1) 元素内联样式（颜色 / 背景 / 字号 / 字重 / 内边距 / 外边距 / 圆角 / 边框 / 对齐 / 行高 / 不透明度）
 *   2) 右键图片 / 精选分类图 / 带背景图的元素 → 上传图片 / GIF / 视频直接替换（头图、背景图、分类图等）
 *   3) 主题 CSS 变量（按当前「亮 / 暗」主题分别编辑，以自然语言说明呈现）
 *
 * - 面板内不出现任何表情符号，图标一律使用内联 SVG。
 * - 所有可调属性的标签均为「中文 / 日文 / 英文」三语。
 * - 面板不显示滚动条（滚动条已隐藏；主题变量改以双列网格排布以压缩高度）。
 * - 主题变量 CSS 名以清晰自然语言说明呈现，技术名仅作小号代码注记。
 *
 * 面板 UI 使用博客主题变量（--card / --foreground / --border / --primary 等），自动跟随亮/暗主题。
 * 主题变量改动会注入 <style> 并持久化到 localStorage，刷新后保留；元素内联改动与图片替换随页面生命周期（刷新还原）。
 * 生产构建（`astro build`）时 `import.meta.env.DEV` 为 false，Layout 中的挂载点会被 tree-shake，
 * 整个组件不会进入产物。
 */

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from 'react';

/* ------------------------------------------------------------------ */
/* 类型                                                                 */
/* ------------------------------------------------------------------ */
type Tab = 'element' | 'theme';
type ThemeMode = 'light' | 'dark';
type VarMap = Record<string, string>;

interface ElProp {
  /** CSS 属性（camelCase，写内联样式用） */
  key: string;
  /** 三语标签：中文 / 日文 / 英文 */
  zh: string;
  ja: string;
  en: string;
  control: 'color' | 'text' | 'select' | 'range';
  options?: string[];
  placeholder?: string;
}

/* ------------------------------------------------------------------ */
/* 可编辑的元素属性（三语标签）                                          */
/* ------------------------------------------------------------------ */
const ELEMENT_PROPS: ElProp[] = [
  { key: 'color', zh: '文字颜色', ja: '文字色', en: 'Text color', control: 'color' },
  { key: 'backgroundColor', zh: '背景颜色', ja: '背景色', en: 'Background color', control: 'color' },
  { key: 'fontSize', zh: '字号', ja: 'フォントサイズ', en: 'Font size', control: 'text', placeholder: '16px' },
  { key: 'fontWeight', zh: '字重', ja: 'ウェイト', en: 'Font weight', control: 'select', options: ['400', '500', '600', '700', 'normal', 'bold'] },
  { key: 'padding', zh: '内边距', ja: 'パディング', en: 'Padding', control: 'text', placeholder: '8px' },
  { key: 'margin', zh: '外边距', ja: 'マージン', en: 'Margin', control: 'text', placeholder: '0' },
  { key: 'borderRadius', zh: '圆角', ja: '角丸', en: 'Border radius', control: 'text', placeholder: '8px' },
  { key: 'border', zh: '边框', ja: 'ボーダー', en: 'Border', control: 'text', placeholder: '1px solid #ccc' },
  { key: 'textAlign', zh: '对齐方式', ja: 'テキスト揃え', en: 'Text align', control: 'select', options: ['left', 'center', 'right', 'justify'] },
  { key: 'lineHeight', zh: '行高', ja: '行間', en: 'Line height', control: 'text', placeholder: '1.5' },
  { key: 'opacity', zh: '不透明度', ja: '不透明度', en: 'Opacity', control: 'range' },
];

/* ------------------------------------------------------------------ */
/* 主题 CSS 变量（亮色 :root / 暗色 html.dark）—— 以自然语言说明呈现      */
/* ------------------------------------------------------------------ */
const THEME_VARS: { v: string; zh: string; ja: string; en: string }[] = [
  { v: '--background', zh: '页面背景色', ja: 'ページ背景', en: 'Page background' },
  { v: '--foreground', zh: '主要文字颜色', ja: 'メイン文字', en: 'Main text' },
  { v: '--primary', zh: '主题强调色', ja: 'アクセント色', en: 'Accent color' },
  { v: '--primary-foreground', zh: '强调色上的文字', ja: 'アクセント文字', en: 'Accent text' },
  { v: '--card', zh: '卡片背景', ja: 'カード背景', en: 'Card background' },
  { v: '--card-foreground', zh: '卡片文字', ja: 'カード文字', en: 'Card text' },
  { v: '--popover', zh: '弹窗背景', ja: 'ポップアップ背景', en: 'Popover background' },
  { v: '--popover-foreground', zh: '弹窗文字', ja: 'ポップアップ文字', en: 'Popover text' },
  { v: '--secondary', zh: '次要背景', ja: 'セカンダリ背景', en: 'Secondary background' },
  { v: '--secondary-foreground', zh: '次要文字', ja: 'セカンダリ文字', en: 'Secondary text' },
  { v: '--muted', zh: '弱化背景', ja: 'ミュート背景', en: 'Muted background' },
  { v: '--muted-foreground', zh: '弱化 / 说明文字', ja: '説明文', en: 'Muted text' },
  { v: '--accent', zh: '强调背景', ja: 'アクセント背景', en: 'Accent background' },
  { v: '--accent-foreground', zh: '强调文字', ja: 'アクセント文字', en: 'Accent text' },
  { v: '--destructive', zh: '危险 / 警告色', ja: '警告色', en: 'Destructive color' },
  { v: '--destructive-foreground', zh: '危险上的文字', ja: '警告文字', en: 'Destructive text' },
  { v: '--border', zh: '边框 / 分割线', ja: 'ボーダー', en: 'Border' },
  { v: '--input', zh: '输入框边框', ja: '入力枠', en: 'Input border' },
  { v: '--ring', zh: '聚焦光环', ja: 'フォーカスリング', en: 'Focus ring' },
  { v: '--radius', zh: '圆角大小', ja: '角丸半径', en: 'Radius' },
  { v: '--color-pink', zh: '粉色点缀', ja: 'ピンク', en: 'Pink accent' },
  { v: '--bg-overlay', zh: '半透明遮罩', ja: 'オーバーレイ', en: 'Overlay' },
  { v: '--gradient-bg-start', zh: '背景渐变起点', ja: 'グラデーション開始', en: 'Gradient start' },
  { v: '--gradient-bg-end', zh: '背景渐变终点', ja: 'グラデーション終了', en: 'Gradient end' },
  { v: '--shoka-blue', zh: '书客蓝', ja: '書客ブルー', en: 'Shoka blue' },
  { v: '--gradient-shoka-button-start', zh: '按钮渐变起点', ja: 'ボタングラデ開始', en: 'Button gradient start' },
  { v: '--gradient-shoka-button-end', zh: '按钮渐变终点', ja: 'ボタングラデ終了', en: 'Button gradient end' },
];

const STYLE_ID = 'dev-style-editor-theme';
const LS_KEY = 'dev-style-editor-theme';

/* ------------------------------------------------------------------ */
/* 颜色工具                                                             */
/* ------------------------------------------------------------------ */
function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
function rgbToHex(r: number, g: number, b: number) {
  const h = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}
function parseRgb(str: string): [number, number, number] | null {
  const m = str.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const parts = m[1].split(',').map((s) => parseFloat(s.trim()));
  if (parts.length < 3 || parts.some(Number.isNaN)) return null;
  return [parts[0], parts[1], parts[2]];
}
function parseHsl(str: string): [number, number, number] | null {
  const m = str.match(/hsla?\(([^)]+)\)/);
  if (!m) return null;
  const parts = m[1].split(',').map((s) => s.trim());
  const h = parseFloat(parts[0]);
  const s = parseFloat(parts[1]);
  const l = parseFloat(parts[2]);
  if ([h, s, l].some(Number.isNaN)) return null;
  return [h, s, l];
}
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}
function anyCssColorToHex(str: string): string | null {
  if (!str) return null;
  const t = str.trim();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(t)) {
    return t.length === 4 ? `#${t[1]}${t[1]}${t[2]}${t[2]}${t[3]}${t[3]}` : t;
  }
  const rgb = parseRgb(t);
  if (rgb) return rgbToHex(rgb[0], rgb[1], rgb[2]);
  const hsl = parseHsl(t);
  if (hsl) {
    const [r, g, b] = hslToRgb(hsl[0], hsl[1], hsl[2]);
    return rgbToHex(r, g, b);
  }
  return null;
}
/** 主题变量形如 `0 12% 99%`（HSL 三元组）时转 hex 供取色器使用 */
function hslTripletToHex(triplet: string): string | null {
  const parts = triplet.trim().split(/\s+/);
  if (parts.length < 3) return null;
  const h = parseFloat(parts[0]);
  const s = parseFloat(parts[1]);
  const l = parseFloat(parts[2]);
  if ([h, s, l].some(Number.isNaN)) return null;
  const [r, g, b] = hslToRgb(h, s, l);
  return rgbToHex(r, g, b);
}
/** hex → HSL 三元组（与主题变量格式一致） */
function hexToHslTriplet(hex: string): string | null {
  const m = hex.match(/^#([0-9a-f]{6})$/i);
  if (!m) return null;
  const num = parseInt(m[1], 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  let h = 0;
  const d = max - min;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }
  const l = Math.round(((max + min) / 2) * 100);
  const s = Math.round((d === 0 ? 0 : d / (1 - Math.abs(max + min - 1))) * 100);
  return `${h} ${s}% ${l}%`;
}
function jsToCss(p: string) {
  return p.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
}

/* ------------------------------------------------------------------ */
/* 上传目标解析（右键元素 → 实际的图片 / 背景节点）                       */
/* 这样精选分类等「图片包在容器里」的情况，右键容器也能替换其中的图片。     */
/* ------------------------------------------------------------------ */
function resolveUploadNode(el: HTMLElement): { node: HTMLElement; kind: 'img' | 'bg' } {
  if (el.tagName === 'IMG') return { node: el, kind: 'img' };
  const img = el.querySelector('img');
  if (img) return { node: img as HTMLElement, kind: 'img' };
  return { node: el, kind: 'bg' };
}

/** 把视频作为背景层注入：绝对定位覆盖目标元素，置于内容之下 */
function injectBgVideo(el: HTMLElement, dataUri: string) {
  const cs = getComputedStyle(el);
  if (cs.position === 'static') el.style.position = 'relative';
  const v = document.createElement('video');
  v.src = dataUri;
  v.autoplay = true;
  v.loop = true;
  v.muted = true;
  v.playsInline = true;
  v.className = 'dse-bg-video';
  v.style.cssText =
    'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;pointer-events:none;';
  // 让原有子元素浮在视频之上
  Array.from(el.children).forEach((c) => {
    const child = c as HTMLElement;
    if (child === v) return;
    const ccs = getComputedStyle(child);
    if (ccs.position === 'static') child.style.position = 'relative';
    if (ccs.zIndex === 'auto') child.style.zIndex = '1';
  });
  el.prepend(v);
}

/* ------------------------------------------------------------------ */
/* 读取级联中的主题变量（通过临时切换 .dark 拿到两套值）                   */
/* ------------------------------------------------------------------ */
function readThemeVars(): { light: VarMap; dark: VarMap } {
  const root = document.documentElement;
  const prev = root.classList.contains('dark');
  const read = () => {
    const cs = getComputedStyle(root);
    const m: VarMap = {};
    for (const item of THEME_VARS) {
      const val = cs.getPropertyValue(item.v).trim();
      if (val) m[item.v] = val;
    }
    return m;
  };
  root.classList.remove('dark');
  const light = read();
  root.classList.add('dark');
  const dark = read();
  root.classList.toggle('dark', prev);
  return { light, dark };
}

/* ------------------------------------------------------------------ */
/* 注入 / 应用主题 <style>                                              */
/* ------------------------------------------------------------------ */
function applyThemeStyle(light: VarMap, dark: VarMap) {
  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    el.id = STYLE_ID;
    document.head.appendChild(el);
  }
  const build = (sel: string, map: VarMap) =>
    `${sel} {\n` +
    THEME_VARS.filter((item) => map[item.v] != null)
      .map((item) => `  ${item.v}: ${map[item.v]};`)
      .join('\n') +
    '\n}';
  el.textContent = `${build(':root', light)}\n${build('html.dark', dark)}`;
}

/* ------------------------------------------------------------------ */
/* 内联 SVG 图标（无表情符号）                                          */
/* ------------------------------------------------------------------ */
function Svg({ children, size = 14 }: { children: ReactNode; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}
function IconClose() {
  return (
    <Svg>
      <path d="M18 6 6 18" />
      <path d="M6 6l12 12" />
    </Svg>
  );
}
function IconUpload() {
  return (
    <Svg>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M17 8l-5-5-5 5" />
      <path d="M12 3v12" />
    </Svg>
  );
}
function IconSun() {
  return (
    <Svg>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </Svg>
  );
}
function IconMoon() {
  return (
    <Svg>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </Svg>
  );
}
function IconCopy() {
  return (
    <Svg>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </Svg>
  );
}
function IconReset() {
  return (
    <Svg>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/* 组件                                                                 */
/* ------------------------------------------------------------------ */
export default function StyleEditor() {
  // 生产构建时此分支在编译期即被消除
  if (!import.meta.env.DEV) return null;

  const [panel, setPanel] = useState<{ x: number; y: number; visible: boolean }>({
    x: 0,
    y: 0,
    visible: false,
  });
  const [tab, setTab] = useState<Tab>('element');
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [elementValues, setElementValues] = useState<VarMap>({});
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');
  const [themeVars, setThemeVars] = useState<{ light: VarMap; dark: VarMap }>({ light: {}, dark: {} });
  const [toast, setToast] = useState('');

  const panelRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<number>();

  const showToast = (msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 1800);
  };

  // 上传目标（右键元素 → 实际可替换的图片 / 背景节点）
  const uploadInfo = useMemo(() => (target ? resolveUploadNode(target) : null), [target]);

  // 初始化主题变量：先采样级联，再用 localStorage 覆盖
  useEffect(() => {
    const sampled = readThemeVars();
    let saved: { light: VarMap; dark: VarMap } | null = null;
    try {
      saved = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
    } catch {
      saved = null;
    }
    const init = saved && saved.light && saved.dark ? saved : sampled;
    setThemeVars(init);
    applyThemeStyle(init.light, init.dark);
    // 同步当前主题模式
    setThemeMode(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 全局右键监听（DEV 下直接生效，无需开关）
  useEffect(() => {
    function onCtx(e: MouseEvent) {
      const panelEl = panelRef.current;
      if (panelEl && e.target instanceof Node && panelEl.contains(e.target)) return;
      if (!(e.target instanceof Element)) return;
      e.preventDefault();
      const el = e.target as HTMLElement;
      targetRef.current = el;
      setTarget(el);
      const cs = getComputedStyle(el);
      const vals: VarMap = {};
      for (const p of ELEMENT_PROPS) {
        const v = cs.getPropertyValue(jsToCss(p.key));
        if (v) vals[p.key] = v;
      }
      setElementValues(vals);
      setTab('element');
      const x = Math.min(e.clientX, window.innerWidth - 320);
      const y = Math.min(e.clientY, window.innerHeight - 380);
      setPanel({ x, y, visible: true });
    }
    // 左键点击面板外的空白处 → 关闭面板（右键交给 contextmenu 处理，忽略）
    function onClick(e: MouseEvent) {
      if (e.button !== 0) return;
      const panelEl = panelRef.current;
      if (!panelEl) return;
      if (e.target instanceof Node && panelEl.contains(e.target)) return;
      setPanel((p) => (p.visible ? { ...p, visible: false } : p));
    }
    document.addEventListener('contextmenu', onCtx);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('contextmenu', onCtx);
      document.removeEventListener('mousedown', onClick);
    };
  }, []);

  // 元素样式改动
  const onElementChange = (key: string, value: string) => {
    const el = targetRef.current;
    if (!el) return;
    if (value === '') el.style.removeProperty(jsToCss(key));
    else el.style.setProperty(jsToCss(key), value);
    setElementValues((prev) => ({ ...prev, [key]: value }));
  };

  // 上传图片 / GIF / 视频 替换（img → src；其它元素 → background / 视频层）
  const onPickImage = () => fileInputRef.current?.click();
  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVideo = file.type.startsWith('video/');
    const el = targetRef.current;
    if (!el) return;
    const { node, kind } = resolveUploadNode(el);
    if (kind === 'img' && isVideo) {
      showToast('图片元素仅支持图片 / GIF');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const data = reader.result as string;
      if (kind === 'img') {
        (node as HTMLImageElement).src = data;
        showToast('已替换图片（刷新后还原）');
      } else if (isVideo) {
        injectBgVideo(node, data);
        showToast('已替换为背景视频（刷新后还原）');
      } else {
        node.style.backgroundImage = `url("${data}")`;
        node.style.backgroundSize = 'cover';
        node.style.backgroundPosition = 'center';
        node.style.backgroundRepeat = 'no-repeat';
        showToast('已替换背景图（刷新后还原）');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // 主题变量改动
  const onThemeChange = (variable: string, value: string) => {
    setThemeVars((prev) => {
      const next = {
        ...prev,
        [themeMode]: { ...prev[themeMode], [variable]: value },
      };
      applyThemeStyle(next.light, next.dark);
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(next));
      } catch {
        /* ignore quota */
      }
      return next;
    });
  };

  const exportCss = () => {
    const el = document.getElementById(STYLE_ID);
    const css = el?.textContent || '';
    if (css && navigator.clipboard) {
      navigator.clipboard.writeText(css).then(
        () => showToast('已复制主题 CSS 到剪贴板'),
        () => showToast('复制失败，请手动复制'),
      );
    } else {
      showToast('暂无可复制的主题改动');
    }
  };

  const resetAll = () => {
    const el = document.getElementById(STYLE_ID);
    if (el) el.textContent = '';
    try {
      localStorage.removeItem(LS_KEY);
    } catch {
      /* ignore */
    }
    const sampled = readThemeVars();
    setThemeVars(sampled);
    applyThemeStyle(sampled.light, sampled.dark);
    showToast('已重置主题变量');
  };

  /* ---------------- 元素标签描述 ---------------- */
  const targetTag = useMemo(() => {
    if (!target) return '';
    let cls = '';
    if (typeof target.className === 'string') {
      cls = target.className
        .split(' ')
        .filter(Boolean)
        .map((c) => '.' + c)
        .join('');
    }
    const id = target.id ? '#' + target.id : '';
    return `${target.tagName.toLowerCase()}${id}${cls}`;
  }, [target]);

  /* ---------------- 渲染 ---------------- */
  return (
    <>
      <style>{CSS}</style>

      {panel.visible && (
        <div
          ref={panelRef}
          className="dse-panel"
          style={{ left: panel.x, top: panel.y }}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <div className="dse-header">
            <span className="dse-title">
              样式编辑器 / スタイルエディタ / Style Editor
            </span>
            <button
              className="dse-x"
              onClick={() => setPanel((p) => ({ ...p, visible: false }))}
              title="关闭 / 閉じる / Close"
              aria-label="关闭"
            >
              <IconClose />
            </button>
          </div>

          <div className="dse-tabs">
            <button className={tab === 'element' ? 'on' : ''} onClick={() => setTab('element')}>
              元素 / 要素 / Element
            </button>
            <button className={tab === 'theme' ? 'on' : ''} onClick={() => setTab('theme')}>
              主题变量 / テーマ変数 / Theme
            </button>
          </div>

          <div className="dse-body">
            {tab === 'element' ? (
              <div>
                <div className="dse-target">{targetTag || '未选择元素'}</div>

                {/* 上传图片 / GIF / 视频：img → src；其它元素 → 背景图或视频层（头图 / 背景图 / 精选分类图等） */}
                <button className="dse-img-btn" onClick={onPickImage}>
                  <IconUpload />
                  {uploadInfo?.kind === 'img'
                    ? '上传图片 / 画像 / Image'
                    : '上传背景 / 背景 / Background'}
                </button>
                <div className="dse-img-hint">
                  右键图片 / 精选分类图 / 背景区域即可上传替换（图片 / GIF / 视频，刷新后还原）
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  className="dse-hidden-file"
                  onChange={onFileChange}
                />

                {ELEMENT_PROPS.map((p) => (
                  <div className="dse-field" key={p.key}>
                    <label>
                      {p.zh} / {p.ja} / {p.en}
                    </label>
                    {p.control === 'color' && (
                      <ColorField
                        value={elementValues[p.key] || ''}
                        onChange={(v) => onElementChange(p.key, v)}
                      />
                    )}
                    {p.control === 'text' && (
                      <input
                        type="text"
                        value={elementValues[p.key] || ''}
                        placeholder={p.placeholder}
                        onChange={(e) => onElementChange(p.key, e.target.value)}
                      />
                    )}
                    {p.control === 'select' && (
                      <select
                        value={elementValues[p.key] || ''}
                        onChange={(e) => onElementChange(p.key, e.target.value)}
                      >
                        <option value="">（默认 / デフォルト / default）</option>
                        {p.options!.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    )}
                    {p.control === 'range' && (
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={parseFloat(elementValues[p.key] || '1')}
                        onChange={(e) => onElementChange(p.key, e.target.value)}
                      />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <div className="dse-mode">
                  <button
                    className={themeMode === 'light' ? 'on' : ''}
                    onClick={() => setThemeMode('light')}
                  >
                    <IconSun />
                    亮色 / ライト / Light
                  </button>
                  <button
                    className={themeMode === 'dark' ? 'on' : ''}
                    onClick={() => setThemeMode('dark')}
                  >
                    <IconMoon />
                    暗色 / ダーク / Dark
                  </button>
                </div>
                <div className="dse-vars">
                  {THEME_VARS.map((item) => {
                    const raw = themeVars[themeMode][item.v] || '';
                    const hex = hslTripletToHex(raw) ?? anyCssColorToHex(raw);
                    const isHsl = /^\d/.test(raw.trim());
                    return (
                      <div className="dse-field" key={item.v}>
                        <label>
                          <span className="dse-varname">{item.v}</span>
                          {item.zh} / {item.ja} / {item.en}
                        </label>
                        <div className="dse-row">
                          <input
                            type="color"
                            value={hex ?? '#000000'}
                            disabled={!hex}
                            onChange={(e) => {
                              const val = isHsl
                                ? hexToHslTriplet(e.target.value) ?? e.target.value
                                : e.target.value;
                              onThemeChange(item.v, val);
                            }}
                          />
                          <input
                            type="text"
                            value={raw}
                            placeholder="如 #fff / 0 12% 99%"
                            onChange={(e) => onThemeChange(item.v, e.target.value)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="dse-footer">
            <button onClick={exportCss}>
              <IconCopy />
              复制 CSS / CSS複製 / Copy
            </button>
            <button onClick={resetAll}>
              <IconReset />
              重置 / リセット / Reset
            </button>
          </div>
        </div>
      )}

      {toast && <div className="dse-toast">{toast}</div>}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* 颜色子组件（取色器 + 文本，互相同步）                                  */
/* ------------------------------------------------------------------ */
function ColorField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const hex = useMemo(() => anyCssColorToHex(value), [value]);
  return (
    <div className="dse-row">
      <input
        type="color"
        value={hex ?? '#000000'}
        disabled={!hex}
        onChange={(e) => onChange(e.target.value)}
      />
      <input
        type="text"
        value={value}
        placeholder="如 #fff / rgb(0,0,0)"
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 样式（使用博客主题变量，自动跟随亮 / 暗主题；面板不显示滚动条）          */
/* ------------------------------------------------------------------ */
/* 说明：本站主题变量是 HSL 三元组（如 --card: 0 12% 99%），必须用 hsl() 包裹才是合法颜色；
   直接写 var(--card) 会拿到裸三元组、颜色失效并回退透明，故所有取色处一律 hsl(var(--x, 三元组 fallback))。
   面板底色用不透明 hsl（无 alpha），确保清晰可读。
   滚动条通过 scrollbar-width:none + ::-webkit-scrollbar{display:none} 隐藏；主题变量改双列网格压缩高度。 */
const CSS = `
.dse-panel{position:fixed;z-index:99999;width:300px;max-height:88vh;overflow:auto;scrollbar-width:none;-ms-overflow-style:none;background:hsl(var(--card, 222 16% 14%));color:hsl(var(--card-foreground, 210 12% 90%));font:12px/1.4 ui-sans-serif,system-ui;box-shadow:0 12px 48px rgba(0,0,0,.4);border:1px solid hsl(var(--border, 220 10% 30%));border-radius:10px}
.dse-panel::-webkit-scrollbar{display:none}
.dse-header{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;border-bottom:1px solid hsl(var(--border, 220 10% 30%));position:sticky;top:0;background:hsl(var(--card, 222 16% 14%));z-index:1}
.dse-title{font-weight:600;color:hsl(var(--primary, 160 84% 39%));font-size:11px;line-height:1.3}
.dse-x{background:0;border:0;color:hsl(var(--muted-foreground, 215 12% 60%));cursor:pointer;line-height:1;padding:2px;display:flex;align-items:center}
.dse-x:hover{color:hsl(var(--foreground, 0 0% 96%))}
.dse-tabs{display:flex;gap:4px;padding:8px 10px 0}
.dse-tabs button{flex:1;display:flex;align-items:center;justify-content:center;gap:4px;background:hsl(var(--muted, 220 12% 22%));color:hsl(var(--muted-foreground, 215 12% 68%));border:0;padding:6px;border-radius:6px;cursor:pointer;font-size:11px}
.dse-tabs button.on{background:hsl(var(--primary, 160 84% 39%));color:hsl(var(--primary-foreground, 150 60% 8%));font-weight:600}
.dse-body{padding:10px}
.dse-target{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;color:hsl(var(--primary, 160 84% 45%));background:hsl(var(--muted, 220 14% 18%));padding:6px 8px;border-radius:6px;margin-bottom:10px;word-break:break-all}
.dse-field{margin-bottom:8px}
.dse-field>label{display:block;color:hsl(var(--muted-foreground, 215 12% 60%));margin-bottom:3px;font-size:10px;line-height:1.3}
.dse-field input[type=text],.dse-field select{width:100%;background:hsl(var(--background, 222 16% 11%));color:hsl(var(--foreground, 0 0% 96%));border:1px solid hsl(var(--border, 220 10% 30%));border-radius:6px;padding:5px 7px;font-size:12px;box-sizing:border-box;outline:none}
.dse-field input[type=text]:focus,.dse-field select:focus{border-color:hsl(var(--primary, 160 84% 39%))}
.dse-row{display:flex;gap:6px;align-items:center}
.dse-row input[type=color]{width:34px;height:30px;border:1px solid hsl(var(--border, 220 10% 30%));border-radius:6px;background:hsl(var(--background, 222 16% 11%));padding:2px;cursor:pointer;flex:none}
.dse-row input[type=text]{flex:1}
.dse-img-btn{display:flex;align-items:center;justify-content:center;gap:6px;width:100%;background:hsl(var(--primary, 160 84% 39%));color:hsl(var(--primary-foreground, 150 60% 8%));border:0;padding:8px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;margin-bottom:6px}
.dse-img-btn:hover{filter:brightness(.96)}
.dse-img-hint{font-size:10px;color:hsl(var(--muted-foreground, 215 12% 60%));margin-bottom:10px;line-height:1.4}
.dse-hidden-file{display:none}
.dse-mode{display:flex;gap:6px;margin-bottom:10px}
.dse-mode button{flex:1;display:flex;align-items:center;justify-content:center;gap:4px;background:hsl(var(--muted, 220 12% 22%));color:hsl(var(--muted-foreground, 215 12% 68%));border:0;padding:6px;border-radius:6px;cursor:pointer;font-size:11px}
.dse-mode button.on{background:hsl(var(--primary, 160 84% 39%));color:hsl(var(--primary-foreground, 150 60% 8%));font-weight:600}
.dse-vars{display:grid;grid-template-columns:1fr 1fr;gap:2px 10px}
.dse-varname{display:block;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:9px;color:hsl(var(--primary, 160 84% 45%));opacity:.75;margin-bottom:2px;word-break:break-all}
.dse-footer{display:flex;gap:8px;padding:10px;border-top:1px solid hsl(var(--border, 220 10% 30%))}
.dse-footer button{flex:1;display:flex;align-items:center;justify-content:center;gap:5px;background:hsl(var(--muted, 220 12% 22%));color:hsl(var(--foreground, 0 0% 96%));border:0;padding:7px;border-radius:6px;cursor:pointer;font-size:11px}
.dse-footer button:hover{filter:brightness(.95)}
.dse-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:100000;background:hsl(var(--primary, 160 84% 39%));color:hsl(var(--primary-foreground, 150 60% 8%));padding:8px 14px;border-radius:8px;font:12px/1.4 ui-sans-serif,system-ui;box-shadow:0 6px 20px rgba(0,0,0,.35)}
`;
