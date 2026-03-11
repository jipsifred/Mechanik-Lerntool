import { useState, useEffect, type CSSProperties } from 'react';
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
  /** Called when fully-revealed state changes — lets parent show/hide action buttons. */
  onFullyRevealedChange?: (val: boolean) => void;
  /** Arrow-key nav callbacks — handled inside via keydown so parent stays clean. */
  onPrev?: () => void;
  onNext?: () => void;
}

export function FlashcardCardBody({
  card,
  showResetButton = true,
  onFullyRevealedChange,
  onPrev,
  onNext,
}: FlashcardCardBodyProps) {
  const { authFetch } = useAuth();
  const [taskData, setTaskData] = useState<ApiTask | null>(null);
  const [revealedCount, setRevealedCount] = useState(0);

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

  // Keyboard navigation (arrow keys + space to reveal)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft') onPrev?.();
      if (e.key === 'ArrowRight') onNext?.();
      if (e.key === ' ') {
        e.preventDefault();
        setRevealedCount(prev => prev < sections.length ? prev + 1 : 0);
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

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-2">
      {/* Scrollable card content */}
      <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
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
                <div
                  className="bg-slate-200/60 rounded-lg border border-slate-200/80 p-3 select-none"
                  style={{ filter: 'blur(4px)', WebkitFilter: 'blur(4px)' }}
                >
                  <span className="text-body text-slate-400">████████████████████████</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action buttons — fixed outside scroll area */}
      {sections.length > 0 && revealedCount < sections.length && (
        <button
          onClick={() => setRevealedCount(prev => prev + 1)}
          className="pill-hover-green shrink-0 glass-panel rounded-full p-1 flex items-center h-10 w-full gap-1 shadow-sm transition-all duration-300 active:scale-[0.98]"
          style={pillStyle}
        >
          <span className="flex-1 px-3 text-body text-slate-500 text-left">Aufdecken</span>
          <div className="pill-icon h-8 w-8 shrink-0 rounded-full flex items-center justify-center neo-btn-gray">
            <Eye size={14} />
          </div>
        </button>
      )}
      {showResetButton && isFullyRevealed && (
        <button
          onClick={() => setRevealedCount(0)}
          className="pill-hover-green shrink-0 glass-panel rounded-full p-1 flex items-center h-10 w-full gap-1 shadow-sm transition-all duration-300 active:scale-[0.98]"
          style={pillStyle}
        >
          <span className="flex-1 px-3 text-body text-slate-500 text-left">Wieder verdecken</span>
          <div className="pill-icon h-8 w-8 shrink-0 rounded-full flex items-center justify-center neo-btn-gray">
            <EyeOff size={14} />
          </div>
        </button>
      )}
    </div>
  );
}
