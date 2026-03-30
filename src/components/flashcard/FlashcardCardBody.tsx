import { useState, useEffect, useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import { MarkdownMath } from '../ui';
import { useAuth } from '../../hooks/useAuth';
import type { Flashcard, FlashcardSection, ApiTask } from '../../types';

function parseSections(back: string): FlashcardSection[] {
  try {
    const parsed = JSON.parse(back);
    if (Array.isArray(parsed)) return parsed;
  } catch { /* not JSON */ }
  return [];
}

interface FlashcardCardBodyProps {
  card: Flashcard;
  /** Show "Wieder verdecken" button after full reveal (review mode). Default true. */
  showResetButton?: boolean;
  /** Optional extra footer content, e.g. shuffle grading actions. */
  footer?: ReactNode;
  /** Optional shell classes for the scrollable content area only. */
  contentShellClassName?: string;
  /** Makes footer actions stick to the bottom of the scrolling card area. */
  stickyFooter?: boolean;
  /** Called when fully-revealed state changes — lets parent show/hide action buttons. */
  onFullyRevealedChange?: (val: boolean) => void;
  /** Arrow-key nav callbacks — handled inside via keydown so parent stays clean. */
  onPrev?: () => void;
  onNext?: () => void;
}

export function FlashcardCardBody({
  card,
  showResetButton = true,
  footer,
  contentShellClassName = '',
  stickyFooter = false,
  onFullyRevealedChange,
  onPrev,
  onNext,
}: FlashcardCardBodyProps) {
  const { authFetch } = useAuth();
  const [taskData, setTaskData] = useState<ApiTask | null>(null);
  const [revealedCount, setRevealedCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const pendingScrollTopRef = useRef<number | null>(null);

  const sections = parseSections(card.back);
  const isFullyRevealed = sections.length > 0 && revealedCount >= sections.length;

  // Reset reveal + clear stale task data when card changes
  useEffect(() => {
    setRevealedCount(0);
    setTaskData(null);
  }, [card.id]);

  // Per-card task data fetch (same as CardReviewView — works on first card too)
  useEffect(() => {
    if (!card.task_id) return;
    authFetch(`/api/tasks/${card.task_id}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data?.task) setTaskData(data.task); })
      .catch(() => {});
  }, [card.task_id, authFetch]);

  // Notify parent when fully-revealed state changes
  useEffect(() => {
    onFullyRevealedChange?.(isFullyRevealed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFullyRevealed]);

  useLayoutEffect(() => {
    if (pendingScrollTopRef.current === null || !scrollRef.current) return;
    const target = pendingScrollTopRef.current;
    const restore = (remainingFrames: number) => {
      if (!scrollRef.current) return;
      scrollRef.current.scrollTop = target;
      if (remainingFrames > 0) {
        requestAnimationFrame(() => restore(remainingFrames - 1));
      }
    };
    restore(3);
    pendingScrollTopRef.current = null;
  }, [revealedCount, isFullyRevealed, footer]);

  const updateRevealCount = (updater: (prev: number) => number) => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    if (scrollRef.current) {
      pendingScrollTopRef.current = scrollRef.current.scrollTop;
    }
    setRevealedCount(updater);
  };

  // Keyboard navigation (arrow keys + space to reveal)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft') onPrev?.();
      if (e.key === 'ArrowRight') onNext?.();
      if (e.key === ' ') {
        e.preventDefault();
        updateRevealCount(prev => prev < sections.length ? prev + 1 : 0);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [sections.length, onPrev, onNext]);

  const givenItems = (() => {
    if (!taskData?.given_latex) return [];
    const clean = taskData.given_latex.replace(/^\s*Gegeben:\s*/i, '');
    return clean.match(/\$[^$]+\$/g) ?? [];
  })();

  const pillStyle = { '--g-stop2': '38%', '--g-stop3': '62%', '--glass-border-light': '#d4d4dc' } as CSSProperties;
  const hiddenAnswerGlowStyle = {
    backgroundColor: 'rgba(182, 255, 164, 0.74)',
    backgroundImage: `
      linear-gradient(90deg, rgba(124, 248, 123, 0.86) 0%, rgba(161, 255, 141, 0.82) 18%, rgba(214, 255, 181, 0.68) 48%, rgba(162, 251, 143, 0.8) 78%, rgba(117, 244, 142, 0.84) 100%),
      radial-gradient(74% 122% at 14% 74%, rgba(101, 255, 118, 0.78) 0%, rgba(101, 255, 118, 0.42) 38%, rgba(101, 255, 118, 0.14) 66%, rgba(101, 255, 118, 0) 100%),
      radial-gradient(64% 96% at 34% 26%, rgba(170, 255, 145, 0.56) 0%, rgba(170, 255, 145, 0.28) 34%, rgba(170, 255, 145, 0.09) 62%, rgba(170, 255, 145, 0) 100%),
      radial-gradient(72% 114% at 76% 66%, rgba(118, 244, 148, 0.56) 0%, rgba(118, 244, 148, 0.28) 36%, rgba(118, 244, 148, 0.09) 64%, rgba(118, 244, 148, 0) 100%),
      radial-gradient(56% 90% at 80% 22%, rgba(246, 255, 166, 0.28) 0%, rgba(246, 255, 166, 0.15) 30%, rgba(246, 255, 166, 0.05) 54%, rgba(246, 255, 166, 0) 100%),
      linear-gradient(118deg, rgba(118, 248, 126, 0.66) 0%, rgba(190, 255, 162, 0.4) 42%, rgba(220, 255, 187, 0.26) 52%, rgba(154, 248, 145, 0.44) 72%, rgba(114, 244, 142, 0.6) 100%)
    `,
    boxShadow: `
      inset 0 0 18px 3px rgba(255, 255, 255, 0.86),
      inset 0 0 44px 10px rgba(255, 255, 255, 0.58),
      inset 0 0 78px 18px rgba(255, 255, 255, 0.22)
    `,
    opacity: 0.78,
    filter: 'saturate(0.9) brightness(1.08)',
  } as CSSProperties;
  const hiddenAnswerEdgeFadeStyle = {
    boxShadow: `
      inset 0 0 10px 2px rgba(255, 255, 255, 0.58),
      inset 0 0 18px 3px rgba(255, 255, 255, 0.28)
    `,
  } as CSSProperties;
  const revealAction = sections.length > 0 && revealedCount < sections.length ? (
    <button
      onClick={() => updateRevealCount(prev => prev + 1)}
      className="pill-hover-green shrink-0 glass-panel rounded-full p-1 flex items-center h-10 w-full gap-1 shadow-sm transition-all duration-300 active:scale-[0.98]"
      style={pillStyle}
    >
      <span className="flex-1 px-3 text-body text-slate-500 text-left">Aufdecken</span>
      <div className="pill-icon h-8 w-8 shrink-0 rounded-full flex items-center justify-center neo-btn-gray">
        <Eye size={14} />
      </div>
    </button>
  ) : null;
  const resetAction = showResetButton && isFullyRevealed ? (
    <button
      onClick={() => updateRevealCount(() => 0)}
      className="pill-hover-green shrink-0 glass-panel rounded-full p-1 flex items-center h-10 w-full gap-1 shadow-sm transition-all duration-300 active:scale-[0.98]"
      style={pillStyle}
    >
      <span className="flex-1 px-3 text-body text-slate-500 text-left">Wieder verdecken</span>
      <div className="pill-icon h-8 w-8 shrink-0 rounded-full flex items-center justify-center neo-btn-gray">
        <EyeOff size={14} />
      </div>
    </button>
  ) : null;
  const hasFooter = Boolean(revealAction || resetAction || footer);

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-2">
      <div className={`flex-1 min-h-0 ${contentShellClassName}`}>
        <div ref={scrollRef} className="flashcard-scroll-area flex h-full min-h-0 flex-col overflow-y-auto">
          <div className="space-y-3 min-h-full pb-2">
          {/* Front: task info */}
            <div className="bg-white/40 rounded-xl border border-white/60 p-4 text-body text-slate-700 space-y-2">
              <h3 className="text-heading font-semibold text-slate-800">
                {taskData?.title || card.front}
              </h3>
              {taskData?.description && (
                <p className="leading-snug">
                  <MarkdownMath text={taskData.description} />
                </p>
              )}
              {givenItems.length > 0 && (
                <>
                  <p className="font-medium text-slate-700">Gegeben:</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {givenItems.map((item, i) => (
                      <span key={i}><MarkdownMath text={item.trim()} /></span>
                    ))}
                  </div>
                </>
              )}
              {taskData?.image_url && (
                <div className="flex items-center justify-center pt-2">
                  <img
                    src={taskData.image_url}
                    alt="Skizze zur Aufgabe"
                    className="max-h-48 max-w-full object-contain rounded-lg"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
            </div>

            {/* Back: sections with progressive reveal */}
            {sections.map((section, i) => {
              const isRevealed = i < revealedCount;
              return (
                <div key={i} className="flex flex-col gap-1.5">
                  <div className="text-label font-semibold text-slate-600 px-1">
                    <MarkdownMath text={section.label} />
                  </div>
                  {isRevealed ? (
                    <div className="bg-white/50 rounded-lg border border-white/60 p-3 markdown-body">
                      <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>
                        {section.content || '*Noch kein Lösungsansatz*'}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="relative overflow-hidden rounded-lg border border-white/60 bg-white/45 p-3 select-none">
                      <div aria-hidden="true" className="invisible markdown-body">
                        <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>
                          {section.content || '*Noch kein Lösungsansatz*'}
                        </ReactMarkdown>
                      </div>
                      <div aria-hidden="true" className="pointer-events-none absolute inset-0 px-1 py-1">
                        <div className="relative h-full w-full overflow-hidden rounded-[20px]">
                          <div className="absolute inset-0" style={hiddenAnswerGlowStyle} />
                          <div className="absolute inset-0" style={hiddenAnswerEdgeFadeStyle} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {hasFooter && (
        <div className={stickyFooter ? 'shrink-0 -mx-1 px-1 pt-2 pb-1' : 'pt-2'}>
          <div className="space-y-2">
            {revealAction}
            {resetAction}
            {footer}
          </div>
        </div>
      )}
    </div>
  );
}
