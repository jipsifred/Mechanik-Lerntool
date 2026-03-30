import { useState, useEffect, useLayoutEffect, useRef, type CSSProperties } from 'react';
import { Check, Eye, EyeOff } from 'lucide-react';
import { MilkdownEditor, MarkdownMath } from '../ui';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import type { Subtask, FlashcardSection } from '../../types';

interface FlashcardPanelProps {
  taskId: number;
  taskTitle: string;
  taskDescription: string;
  taskGivenLatex: string;
  taskImageUrl: string | null;
  subtasks: Subtask[];
  mode: 'edit' | 'review';
  cardSide: 'front' | 'back';
  /* from useFlashcards */
  sections: FlashcardSection[];
  saving: boolean;
  saved: boolean;
  onLoadOrInit: (taskId: number, front: string, subtasks: Subtask[]) => void;
  onUpdateSection: (index: number, content: string) => void;
}

function FrontSide({ title, description, givenLatex, imageUrl }: {
  title: string; description: string; givenLatex: string; imageUrl: string | null;
}) {
  const cleanGiven = givenLatex?.replace(/^\s*Gegeben:\s*/i, '') ?? '';
  const givenItems = cleanGiven ? cleanGiven.match(/\$[^$]+\$/g) ?? [] : [];

  return (
    <div className="flex-1 flex flex-col overflow-y-auto space-y-2 text-body text-slate-700">
      <h3 className="text-heading font-semibold text-slate-800">{title}</h3>
      <p className="leading-snug">
        <MarkdownMath text={description} />
      </p>
      {givenItems.length > 0 && (
        <>
          <p className="font-medium">Gegeben:</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {givenItems.map((item, i) => (
              <span key={i}><MarkdownMath text={item.trim()} /></span>
            ))}
          </div>
        </>
      )}
      {imageUrl && (
        <div className="shrink-0 flex items-center justify-center pt-2">
          <img
            src={imageUrl}
            alt="Skizze zur Aufgabe"
            className="max-h-48 max-w-full object-contain rounded-lg"
            referrerPolicy="no-referrer"
          />
        </div>
      )}
    </div>
  );
}

function EditBackSide({ sections, onUpdateSection }: {
  sections: FlashcardSection[];
  onUpdateSection: (index: number, content: string) => void;
}) {
  return (
    <div className="flex-1 flex flex-col overflow-y-auto space-y-3">
      {sections.map((section, i) => (
        <div key={i} className="flex flex-col gap-1.5">
          <div className="text-label font-semibold text-slate-600 px-1">
            <MarkdownMath text={section.label} />
          </div>
          <MilkdownEditor
            defaultValue={section.content}
            onChange={(md) => onUpdateSection(i, md)}
            placeholder="Lösungsansatz hier beschreiben..."
            inlineContext="karteikarten"
          />
        </div>
      ))}
      {sections.length === 0 && (
        <div className="text-body text-slate-400 text-center py-8">
          Keine Teilaufgaben vorhanden.
        </div>
      )}
    </div>
  );
}

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

function ReviewBackSide({ sections }: { sections: FlashcardSection[] }) {
  const [revealedCount, setRevealedCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const pendingScrollTopRef = useRef<number | null>(null);

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
  }, [revealedCount]);

  const updateRevealCount = (updater: (prev: number) => number) => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    if (scrollRef.current) {
      pendingScrollTopRef.current = scrollRef.current.scrollTop;
    }
    setRevealedCount(updater);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-2">
      {/* Scrollable sections */}
    <div ref={scrollRef} className="flashcard-scroll-area flex-1 overflow-y-auto space-y-3 min-h-0">
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

      {/* Action buttons — pinned below scroll area, identical to FlashcardCardBody desktop style */}
      {sections.length > 0 && revealedCount < sections.length && (
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
      )}
      {revealedCount > 0 && revealedCount >= sections.length && (
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
      )}
    </div>
  );
}

export function FlashcardPanel({
  taskId,
  taskTitle,
  taskDescription,
  taskGivenLatex,
  taskImageUrl,
  subtasks,
  mode,
  cardSide,
  sections,
  saving,
  saved,
  onLoadOrInit,
  onUpdateSection,
}: FlashcardPanelProps) {
  // Load/init card when taskId changes
  useEffect(() => {
    if (taskId) {
      onLoadOrInit(taskId, taskTitle, subtasks);
    }
  }, [taskId]);

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      {/* Save indicator (edit mode only) */}
      {mode === 'edit' && (
        <div className="absolute top-2 right-3 z-10">
          <span className={`text-hint flex items-center gap-1 transition-opacity duration-300 ${
            saving ? 'opacity-100 text-slate-400' : saved ? 'opacity-100 text-emerald-500' : 'opacity-0 text-emerald-500'
          }`}>
            <Check size={12} />
            {saving ? 'Speichern...' : 'Gespeichert'}
          </span>
        </div>
      )}

      {/* Content */}
      {cardSide === 'front' ? (
        <FrontSide
          title={taskTitle}
          description={taskDescription}
          givenLatex={taskGivenLatex}
          imageUrl={taskImageUrl}
        />
      ) : mode === 'edit' ? (
        <EditBackSide
          sections={sections}
          onUpdateSection={onUpdateSection}
        />
      ) : (
        <ReviewBackSide sections={sections} />
      )}
    </div>
  );
}
