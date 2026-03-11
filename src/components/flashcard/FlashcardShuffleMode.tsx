import { useState, useEffect } from 'react';
import { X, Check, ChevronRight, Eye } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import { MarkdownMath } from '../ui';
import { useAuth } from '../../hooks/useAuth';
import type { ShuffleSession, FlashcardSection, ApiTask } from '../../types';

function parseSections(back: string): FlashcardSection[] {
  try {
    const parsed = JSON.parse(back);
    if (Array.isArray(parsed)) return parsed;
  } catch { /* not JSON */ }
  return [];
}

interface FlashcardShuffleModeProps {
  session: ShuffleSession;
  onGekonnt: () => void;
  onNichtGekonnt: () => void;
  onClose: () => void;
}

export function FlashcardShuffleMode({ session, onGekonnt, onNichtGekonnt, onClose }: FlashcardShuffleModeProps) {
  const { authFetch } = useAuth();
  const [revealedCount, setRevealedCount] = useState(0);
  const [taskData, setTaskData] = useState<ApiTask | null>(null);

  const currentCard = session.queue[0] ?? null;
  const sections = currentCard ? parseSections(currentCard.back) : [];
  const isFullyRevealed = sections.length > 0 && revealedCount >= sections.length;
  const progress = session.totalCards - session.queue.length;
  const progressPct = session.totalCards > 0 ? (progress / session.totalCards) * 100 : 0;

  // Reset reveal state when card changes
  useEffect(() => {
    setRevealedCount(0);
    setTaskData(null);
  }, [currentCard?.id]);

  // Load task data for the front side
  useEffect(() => {
    if (!currentCard?.task_id) return;
    authFetch(`http://localhost:7863/api/tasks/${currentCard.task_id}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data?.task) setTaskData(data.task); })
      .catch(() => {});
  }, [currentCard?.task_id, authFetch]);

  const givenItems = (() => {
    if (!taskData?.given_latex) return [];
    const clean = taskData.given_latex.replace(/^\s*Gegeben:\s*/i, '');
    return clean.match(/\$[^$]+\$/g) ?? [];
  })();

  if (session.isDone) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full neo-btn-green flex items-center justify-center mx-auto mb-3">
            <Check size={24} strokeWidth={2.5} />
          </div>
          <h3 className="text-heading font-semibold text-slate-800 mb-1">Alle Karten gelernt!</h3>
          <p className="text-body text-slate-500">
            {session.totalCards} {session.totalCards === 1 ? 'Karte' : 'Karten'} abgefragt
          </p>
        </div>
        <button onClick={onClose} className="px-5 py-2 rounded-full text-body font-medium neo-btn-gray transition-all duration-200 active:scale-95">
          Beenden
        </button>
      </div>
    );
  }

  if (!currentCard) return null;

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-3">
      {/* Progress bar + counter + close */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex-1 h-1.5 rounded-full bg-slate-200/80 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%`, background: 'var(--neo-green-base)' }}
          />
        </div>
        <span className="text-label text-slate-500 shrink-0 tabular-nums">
          {progress}/{session.totalCards}
        </span>
        <button
          onClick={onClose}
          title="Abbrechen"
          className="h-6 w-6 rounded-full flex items-center justify-center glassy-button text-slate-400 hover:text-slate-600 transition-colors active:scale-95"
        >
          <X size={13} />
        </button>
      </div>

      {/* Scrollable card content */}
      <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
        {/* Front: task info */}
        <div className="bg-white/40 rounded-xl border border-white/60 p-4 text-body text-slate-700 space-y-2">
          <h3 className="text-heading font-semibold text-slate-800">
            {taskData?.title || currentCard.front}
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

        {/* Reveal button */}
        {sections.length > 0 && revealedCount < sections.length && (
          <button
            onClick={() => setRevealedCount(prev => prev + 1)}
            className="self-center mt-2 flex items-center gap-1.5 px-4 py-2 rounded-full text-body font-medium neo-btn-green-vivid transition-all duration-200 active:scale-95"
          >
            <Eye size={15} />
            Aufdecken
            <ChevronRight size={14} />
          </button>
        )}
      </div>

      {/* Action buttons — only after full reveal */}
      {isFullyRevealed && (
        <div className="flex gap-3 shrink-0 pt-1">
          <button
            onClick={onNichtGekonnt}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-body font-medium neo-btn-red transition-all duration-200 active:scale-95"
          >
            <X size={15} />
            Nicht gekonnt
          </button>
          <button
            onClick={onGekonnt}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-body font-medium neo-btn-green-vivid transition-all duration-200 active:scale-95"
          >
            <Check size={15} />
            Gekonnt
          </button>
        </div>
      )}
    </div>
  );
}
