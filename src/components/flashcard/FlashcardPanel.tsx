import { useState, useEffect, type CSSProperties } from 'react';
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

function ReviewBackSide({ sections }: { sections: FlashcardSection[] }) {
  const [revealedCount, setRevealedCount] = useState(0);

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-2">
      {/* Scrollable sections */}
      <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
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

      {/* Action buttons — pinned below scroll area, identical to FlashcardCardBody desktop style */}
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
      {revealedCount > 0 && revealedCount >= sections.length && (
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
