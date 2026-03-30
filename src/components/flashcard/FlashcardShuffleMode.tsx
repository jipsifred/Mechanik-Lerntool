import { useState, type CSSProperties } from 'react';
import { ArrowLeft, X, Check } from 'lucide-react';
import { FlashcardCardBody } from './FlashcardCardBody';
import { GlassContainer, GlassButton } from '../ui';
import type { ShuffleSession } from '../../types';

interface FlashcardShuffleModeProps {
  session: ShuffleSession;
  onGekonnt: () => void;
  onNichtGekonnt: () => void;
  onClose: () => void;
  stickyFooter?: boolean;
  stickyHeader?: boolean;
}

export function FlashcardShuffleMode({
  session,
  onGekonnt,
  onNichtGekonnt,
  onClose,
  stickyFooter = false,
  stickyHeader = false,
}: FlashcardShuffleModeProps) {
  const [isFullyRevealed, setIsFullyRevealed] = useState(false);

  const currentCard = session.queue[0] ?? null;
  const progress = session.totalCards - session.queue.length;
  const progressPct = session.totalCards > 0 ? (progress / session.totalCards) * 100 : 0;

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

  const progressLabel = `${progress}/${session.totalCards}`;
  const gradingActions = isFullyRevealed ? (
    <div className="flex gap-2 pt-1">
      <button
        onClick={onNichtGekonnt}
        className={`${stickyFooter ? 'glass-panel' : 'pill-hover-red glass-panel'} flex-1 rounded-full p-1 flex items-center h-10 gap-1 shadow-sm transition-all duration-300 active:scale-[0.98]`}
        style={{ '--g-stop2': '38%', '--g-stop3': '62%', '--glass-border-light': '#d4d4dc' } as CSSProperties}
      >
        <span className="flex-1 px-3 text-body text-left text-slate-500">Nicht gekonnt</span>
        <div className={`pill-icon h-8 w-8 shrink-0 rounded-full flex items-center justify-center ${stickyFooter ? 'neo-btn-red' : 'neo-btn-gray'}`}>
          <X size={14} />
        </div>
      </button>
      <button
        onClick={onGekonnt}
        className={`${stickyFooter ? 'glass-panel' : 'pill-hover-green glass-panel'} flex-1 rounded-full p-1 flex items-center h-10 gap-1 shadow-sm transition-all duration-300 active:scale-[0.98]`}
        style={{ '--g-stop2': '38%', '--g-stop3': '62%', '--glass-border-light': '#d4d4dc' } as CSSProperties}
      >
        <span className="flex-1 px-3 text-body text-left text-slate-500">Gekonnt</span>
        <div className={`pill-icon h-8 w-8 shrink-0 rounded-full flex items-center justify-center ${stickyFooter ? 'neo-btn-green' : 'neo-btn-gray'}`}>
          <Check size={14} />
        </div>
      </button>
    </div>
  ) : null;

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-3">
      <div className={`${stickyHeader ? 'sticky top-0 z-10 -mx-1 px-1 pb-2' : ''} flex items-center gap-3 shrink-0`}>
        <GlassContainer className="h-10 w-10 justify-center shrink-0">
          <GlassButton onClick={onClose} title="Zurück" className="active:scale-95">
            <ArrowLeft size={16} />
          </GlassButton>
        </GlassContainer>
        <div className="flex-1 h-1.5 rounded-full bg-slate-200/80 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%`, background: 'var(--neo-green-base)' }}
          />
        </div>
        <span className="text-label text-slate-500 shrink-0 tabular-nums">
          {progressLabel}
        </span>
      </div>

      {/* Card body — per-card data fetching, reveal logic */}
      <FlashcardCardBody
        card={currentCard}
        showResetButton={false}
        contentShellClassName={stickyFooter ? 'glass-panel-soft panel-radius flex-1 min-h-0 overflow-hidden p-4' : ''}
        stickyFooter={stickyFooter}
        footer={stickyFooter ? gradingActions : null}
        onFullyRevealedChange={setIsFullyRevealed}
      />

      {/* Gekonnt / Nicht gekonnt — only after full reveal */}
      {!stickyFooter && gradingActions}
    </div>
  );
}
