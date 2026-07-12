import { useState, useRef, useEffect, useCallback, Children } from 'react';
import type { ReactNode, ReactElement } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Icon } from '@iconify/react';
import { useStore } from '@nanostores/react';
import { useTranslation } from '@hooks/useTranslation';
import { $chatScope, $chatOpen, clearChatScope, openGeneralChat, closeChatPanel } from '@store/chat';
import './chat-markdown.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// ---------- Markdown rendering for assistant messages ----------

function PreBlock({ children }: { children?: ReactNode }) {
  const [copied, setCopied] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);

  const codeChild = Children.toArray(children)[0] as
    | ReactElement<{ className?: string }>
    | undefined;
  const className = codeChild?.props?.className ?? '';
  const langMatch = className.match(/language-(\w+)/);
  const lang = langMatch?.[1] || 'code';

  const handleCopy = async () => {
    const text = preRef.current?.textContent ?? '';
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be unavailable */
    }
  };

  return (
    <div className="chat-codeblock">
      <div className="chat-codeblock-header">
        <span className="chat-codeblock-lang">{lang}</span>
        <button type="button" className="chat-codeblock-copy" onClick={handleCopy}>
          {copied ? '已复制' : '复制'}
        </button>
      </div>
      <pre ref={preRef}>{children}</pre>
    </div>
  );
}

// 流式输出时，未闭合的代码围栏（``` 或 ~~~）会让 Markdown 解析器把后续所有内容
// 都吞进代码块，导致排版错乱。渲染前检测围栏数是否为奇数（最后一个未闭合），
// 临时补一个闭合围栏 —— 仅用于展示，不修改实际消息 state。
function fixUnclosedFence(md: string): string {
  const fences = md.match(/(```|~~~)/g);
  if (!fences) return md;
  if (fences.length % 2 === 1) {
    return `${md}\n${fences[fences.length - 1]}`;
  }
  return md;
}

function MarkdownContent({ content }: { content: string }) {
  const safe = fixUnclosedFence(content);
  return (
    <div className="chat-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          pre: PreBlock,
        }}
      >
        {safe}
      </ReactMarkdown>
    </div>
  );
}

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  // 与文章页「就这篇文章问 AI」按钮联动：scope 限定到某篇文章，open 控制面板开关
  const chatScope = useStore($chatScope);
  const chatOpen = useStore($chatOpen);

  // 由外部 store（$chatOpen）驱动面板开关，统一悬浮按钮与文章按钮的打开行为
  useEffect(() => {
    setIsOpen(chatOpen);
  }, [chatOpen]);

  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: '你好！我是 AI 助手，有什么可以帮你的吗？' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // 打字机效果：流式 SSE 只负责把全量文本喂进 fullTextRef，
  // 再由 requestAnimationFrame 按固定速度逐字揭开到 typingLen，实现逐字显示。
  const [isTyping, setIsTyping] = useState(false);
  const [typingLen, setTypingLen] = useState(0);
  const fullTextRef = useRef('');
  const typedPosRef = useRef(0);
  const streamDoneRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      // Delay to ensure DOM is ready on mobile
      requestAnimationFrame(() => scrollToBottom());
    }
  }, [messages, isOpen]);

  // Close on Escape (especially useful on mobile full-screen)
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen]);

  // Cleanup any in-flight request / typewriter animation on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handleStop = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsLoading(false);
  }, []);

  // ---------- 打字机逐字显示 ----------
  // 取消正在进行的逐字动画
  const cancelTypewriter = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  // 启动逐字动画：以 CPS 个字/秒的速度从 fullTextRef 揭开到 typingLen，
  // 直到揭开长度追上全文 且 流式已结束。流式持续到达时全文会变长，自动续打。
  const startTypewriter = () => {
    cancelTypewriter();
    typedPosRef.current = 0;
    lastTsRef.current = 0;
    setTypingLen(0);
    setIsTyping(true);
    const CPS = 45; // 每秒约 45 字（中英文同速，约 22ms/字）
    const tick = (ts: number) => {
      if (!lastTsRef.current) lastTsRef.current = ts;
      const dt = (ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;
      const full = fullTextRef.current;
      if (typedPosRef.current < full.length) {
        typedPosRef.current = Math.min(full.length, typedPosRef.current + dt * CPS);
      }
      const n = Math.floor(typedPosRef.current);
      setTypingLen(n);
      // 还没揭开完，或流式还没结束（全文可能继续增长）→ 继续
      if (n < full.length || !streamDoneRef.current) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setIsTyping(false);
        rafRef.current = null;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  // Call the chat API. 只走自托管 RAG 的同源端点 /api/chat-api/chat/completions
  // （边缘函数整体挂在 /api/* 下，chat 分支在 /api/chat-api/*，由 handleChatRag 处理：嵌入→Neon 检索→Moonshot 生成）。
  // 不再依赖任何第三方托管搜索（如 Cloudflare AI Search）。
  const callChatApi = async (newMessages: Message[], controller: AbortController): Promise<Response> => {
    const body = JSON.stringify({
      messages: newMessages.map(m => ({ role: m.role, content: m.content })),
      // 范围模式：把当前文章 id/slug 带给边缘函数，限定只检索该文
      postScope: chatScope ? { id: chatScope.id, slug: chatScope.slug } : null,
      stream: true,
    });

    const candidates = [
      '/api/chat-api/chat/completions',             // 自托管 RAG 同源端点（边缘函数 /api/* 下的 /api/chat-api/*，dev 代理转发到已部署函数）
    ];

    let lastError: unknown = null;
    for (const apiUrl of candidates) {
      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          signal: controller.signal,
        });
        if (!response.ok) {
          lastError = new Error(`HTTP error! status: ${response.status}`);
          continue;
        }
        return response;
      } catch (e) {
        lastError = e;
        continue;
      }
    }
    throw lastError ?? new Error('所有接口请求失败');
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user' as const, content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    // 复位并启动打字机（流式 SSE 只喂全文，逐字显示由 rAF 负责）
    cancelTypewriter();
    fullTextRef.current = '';
    typedPosRef.current = 0;
    streamDoneRef.current = false;
    startTypewriter();

    // Create an abort controller for this request
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Immediately add an empty assistant message that we'll fill as tokens arrive
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const response = await callChatApi(newMessages, controller);

      // Check if the response is actually a stream (SSE)
      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('text/event-stream') || response.body) {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE lines
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data:')) continue;

            const data = trimmed.slice(5).trim();
            if (data === '[DONE]') {
              break;
            }

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                // 累积全文，逐字显示交给 rAF 打字机
                fullTextRef.current += delta;
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: 'assistant',
                    content: fullTextRef.current,
                  };
                  return updated;
                });
              }
            } catch {
              // Skip malformed JSON chunks
              continue;
            }
          }
        }

        // 流式结束，通知打字机可以收尾（追平剩余未显示的字符）
        streamDoneRef.current = true;

        // If we got no content at all, show a fallback
        if (!fullTextRef.current) {
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: 'assistant',
              content: '抱歉，我没有得到有效的回复。',
            };
            return updated;
          });
        }
      } else {
        // Fallback: non-streaming JSON response
        const data = await response.json();
        const reply = data.choices?.[0]?.message?.content || '抱歉，我没有得到有效的回复。';
        fullTextRef.current = reply;
        streamDoneRef.current = true;
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: reply };
          return updated;
        });
      }
    } catch (error: unknown) {
      // AbortError is expected when user clicks stop
      if (error instanceof DOMException && error.name === 'AbortError') {
        // fullTextRef 已在流式时被每个 delta 同步，直接沿用即可
        setMessages(prev => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === 'assistant' && !last.content) {
            updated[updated.length - 1] = {
              role: 'assistant',
              content: '（已停止生成）',
            };
          }
          return updated;
        });
      } else {
        console.error('Chat API Error:', error);
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: 'assistant',
            content: '抱歉，请求出错，请稍后再试。',
          };
          return updated;
        });
      }
      // 无论中止还是出错，都让打字机追平已显示内容后收尾
      streamDoneRef.current = true;
    } finally {
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed z-50 print:hidden">
      {isOpen && (
        <>
          {/* Mobile backdrop */}
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm sm:hidden"
            onClick={() => closeChatPanel()}
          />

          {/* Chat panel - responsive */}
          <div className="fixed inset-0 sm:inset-auto sm:bottom-20 sm:right-20 flex flex-col
                          w-full h-[100dvh] sm:w-[400px] sm:h-[600px] sm:max-h-[85vh]
                          bg-card text-card-foreground
                          sm:rounded-2xl rounded-none shadow-2xl
                          border border-border overflow-hidden
                          transition-all duration-300">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground flex-shrink-0">
              <h3 className="font-medium flex items-center gap-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                AI 助手
              </h3>
              <div className="flex items-center gap-1">
                {/* Stop button while streaming */}
                {isLoading && (
                  <button
                    onClick={handleStop}
                    className="hover:bg-black/10 p-1.5 rounded-md transition-colors"
                    aria-label="停止生成"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <rect x="6" y="6" width="12" height="12" rx="2" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={() => closeChatPanel()}
                  className="hover:bg-black/10 p-1.5 rounded-md transition-colors"
                  aria-label="关闭"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* 范围模式提示条：限定只讨论某篇文章，可一键退出回到通用模式 */}
            {chatScope && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-muted text-muted-foreground text-xs border-b border-border flex-shrink-0">
                <Icon icon="ri:file-text-line" className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="truncate flex-1">{t('chat.scopedPrefix')}{chatScope.title}</span>
                <button
                  type="button"
                  onClick={() => clearChatScope()}
                  className="shrink-0 rounded px-1.5 py-0.5 transition-colors hover:bg-background hover:text-foreground"
                  aria-label={t('chat.exitScope')}
                  title={t('chat.exitScope')}
                >
                  <Icon icon="ri:close-line" className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4 space-y-3 sm:space-y-4 bg-muted">
              {messages.map((msg, idx) => {
                const isLast = idx === messages.length - 1;
                const isTypingThis = isTyping && isLast && msg.role === 'assistant';
                const isUser = msg.role === 'user';
                return (
                  <div key={idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[88%] sm:max-w-[85%] px-3.5 sm:px-4 py-2 rounded-2xl text-sm sm:text-[14px] leading-relaxed break-words ${
                      isUser
                        ? 'bg-primary text-primary-foreground rounded-tr-sm whitespace-pre-wrap'
                        : 'bg-card text-card-foreground shadow-sm rounded-tl-sm border border-border'
                    }`}>
                      {isUser ? (
                        msg.content
                      ) : (
                        // 打字机：正在逐字显示时只渲染已揭开的前 typingLen 个字符
                        <MarkdownContent content={isTypingThis ? msg.content.slice(0, typingLen) : msg.content} />
                      )}
                      {isTypingThis && !msg.content && (
                        <span className="chat-typing" aria-label="正在输入">
                          <span />
                          <span />
                          <span />
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-2 sm:p-3 bg-card border-t border-border flex-shrink-0">
              <div className="flex items-end gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="输入问题..."
                  rows={1}
                  className="flex-1 resize-none bg-muted text-foreground text-sm rounded-2xl px-4 py-2.5 max-h-32 min-h-[40px] focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                  style={{
                    height: 'auto',
                  }}
                  onInput={(e) => {
                    const el = e.target as HTMLTextAreaElement;
                    el.style.height = 'auto';
                    el.style.height = Math.min(el.scrollHeight, 128) + 'px';
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={isLoading || isTyping || !input.trim()}
                  className="bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed p-2.5 rounded-full transition-all active:scale-95 flex-shrink-0"
                  aria-label="发送"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ transform: 'translateX(1px) translateY(-1px)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => openGeneralChat()}
          className="fixed bottom-4 left-4 sm:bottom-6 sm:left-auto sm:right-20
                     bg-primary text-primary-foreground
                     p-3 sm:p-3.5 rounded-full shadow-shoka-button
                     transition-all hover:scale-110 active:scale-95
                     touch-manipulation"
          aria-label="打开 AI 助手"
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </button>
      )}
    </div>
  );
}
