/**
 * Mermaid Navigation Fix
 * 修复从无 mermaid 页面导航到有 mermaid 页面时的渲染问题。
 *
 * 问题根源：astro-mermaid 的 astro:after-swap 监听器被注册在 import().then() 内部，
 * 当首页没有 mermaid 图表时，监听器不会被注册，导致客户端导航时无法渲染。
 *
 * 本文件作为独立模块被 Layout 的 `<script>import '...'</script>` 引入（由 Astro/Vite 正常打包，
 * mermaid 依赖会被正确解析），避免把大段带 TS 类型的代码内联进 <head> 导致浏览器解析报错。
 */

let mermaidModule: typeof import('mermaid').default | null = null;
let themeObserverSetup = false;

function hasUnprocessedDiagrams(): boolean {
  return document.querySelectorAll('pre.mermaid:not([data-processed])').length > 0;
}

function getCurrentTheme(): string {
  const dataTheme =
    document.documentElement.getAttribute('data-theme') ||
    document.body?.getAttribute('data-theme');
  // 仅映射到 mermaid 支持的有限主题值
  switch (dataTheme) {
    case 'default':
    case 'dark':
    case 'forest':
    case 'neutral':
    case 'base':
    case 'null':
      return dataTheme;
    case 'light':
      return 'default';
    default:
      return 'default';
  }
}

async function initMermaidDiagrams(): Promise<void> {
  const diagrams = document.querySelectorAll('pre.mermaid:not([data-processed])');
  if (diagrams.length === 0) return;

  if (!mermaidModule) {
    const { default: mermaid } = await import('mermaid');
    mermaidModule = mermaid;
  }

  mermaidModule.initialize({
    startOnLoad: false,
    theme: getCurrentTheme(),
    gitGraph: {
      mainBranchName: 'main',
      showCommitLabel: true,
      showBranches: true,
      rotateCommitLabel: true,
    },
  });

  for (const diagram of diagrams) {
    const pre = diagram as HTMLElement;
    if (!pre.hasAttribute('data-diagram')) {
      pre.setAttribute('data-diagram', pre.textContent || '');
    }
    const definition = pre.getAttribute('data-diagram') || '';
    const id = 'mermaid-' + Math.random().toString(36).slice(2, 11);

    try {
      const { svg } = await mermaidModule.render(id, definition);
      pre.innerHTML = svg;
      pre.setAttribute('data-processed', 'true');
    } catch (error) {
      console.error('[mermaid-nav-fix] Error:', error);
      pre.setAttribute('data-processed', 'true');
    }
  }

  window.dispatchEvent(new CustomEvent('mermaid:rendered'));

  if (!themeObserverSetup && mermaidModule) {
    const observer = new MutationObserver(() => {
      document
        .querySelectorAll('pre.mermaid[data-processed]')
        .forEach((d) => d.removeAttribute('data-processed'));
      initMermaidDiagrams();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    themeObserverSetup = true;
  }
}

// 关键：始终注册监听器，不依赖当前页面内容。
// 只处理客户端导航场景，直接访问时由 astro-mermaid 处理。
document.addEventListener('astro:after-swap', () => {
  requestAnimationFrame(() => {
    if (hasUnprocessedDiagrams()) {
      initMermaidDiagrams();
    }
  });
});
