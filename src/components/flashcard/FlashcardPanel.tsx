import { useState, useEffect } from 'react';
import { Check, Eye, EyeOff, ChevronRight, Shuffle } from 'lucide-react';
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
  onStartShuffle?: () => void;
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

function ReviewBackSide({ sections }: { sections: FlashcardSection[] }) {
  const [revealedCount, setRevealedCount] = useState(0);

  return (
    <div className="flex-1 flex flex-col overflow-y-auto space-y-3">
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

      {revealedCount < sections.length && (
        <button
          onClick={() => setRevealedCount(prev => prev + 1)}
          className="self-center mt-2 flex items-center gap-1.5 px-4 py-2 rounded-full text-body font-medium neo-btn-green-vivid transition-all duration-200"
        >
          <Eye size={15} />
          Aufdecken
          <ChevronRight size={14} />
        </button>
      )}
      {revealedCount > 0 && revealedCount >= sections.length && (
        <button
          onClick={() => setRevealedCount(0)}
          className="self-center mt-2 flex items-center gap-1.5 px-4 py-2 rounded-full text-body font-medium neo-btn-gray transition-all duration-200"
        >
          <EyeOff size={15} />
          Wieder verdecken
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
  onStartShuffle,
}: FlashcardPanelProps) {
  // Load/init card when taskId changes
  useEffect(() => {
    if (taskId) {
      onLoadOrInit(taskId, taskTitle, subtasks);
    }
  }, [taskId]);

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      {/* Top bar: save indicator + shuffle pill */}
      <div className="flex items-center justify-end mb-2 shrink-0 gap-2 h-7">
        {mode === 'edit' && (
          <span className={`text-hint flex items-center gap-1 transition-opacity duration-300 ${
            saving ? 'opacity-100 text-slate-400' : saved ? 'opacity-100 text-emerald-500' : 'opacity-0 text-emerald-500'
          }`}>
            <Check size={12} />
            {saving ? 'Speichern...' : 'Gespeichert'}
          </span>
        )}
        {onStartShuffle && (
          <div className="flex items-center glass-panel-soft rounded-full px-1 py-0.5 gap-0.5">
            <button
              onClick={onStartShuffle}
              title="Alle Karten dieser Auswahl abfragen"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-hint font-medium hover-neo-btn-green transition-all duration-200 active:scale-95"
            >
              <Shuffle size={12} />
              Shuffle
            </button>
          </div>
        )}
      </div>

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
