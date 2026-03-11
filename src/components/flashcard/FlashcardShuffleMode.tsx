import { useState } from 'react';
import { ArrowLeft, X, Check } from 'lucide-react';
import { FlashcardCardBody } from './FlashcardCardBody';
import { GlassContainer, GlassButton } from '../ui';
import type { ShuffleSession } from '../../types';

interface FlashcardShuffleModeProps {
  session: ShuffleSession;
  onGekonnt: () => void;
  onNichtGekonnt: () => void;
  onClose: () => void;
}

export function FlashcardShuffleMode({ session, onGekonnt, onNichtGekonnt, onClose }: FlashcardShuffleModeProps) {
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

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-3">
      {/* Back button + progress bar + counter */}
      <div className="flex items-center gap-3 shrink-0">
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
          {progress}/{session.totalCards}
        </span>
      </div>

      {/* Card body — per-card data fetching, reveal logic */}
      <FlashcardCardBody
        card={currentCard}
        showResetButton={false}
        onFullyRevealedChange={setIsFullyRevealed}
      />

      {/* Gekonnt / Nicht gekonnt — only after full reveal */}
      {isFullyRevealed && (
        <div className="flex justify-center gap-3 shrink-0 pt-1">
          <button
            onClick={onNichtGekonnt}
            title="Nicht gekonnt"
            className="h-8 w-8 shrink-0 rounded-full flex items-center justify-center transition-all duration-300 neo-btn-gray active:scale-95"
          >
            <X size={14} />
          </button>
          <button
            onClick={onGekonnt}
            title="Gekonnt"
            className="h-8 w-8 shrink-0 rounded-full flex items-center justify-center transition-all duration-300 neo-btn-gray active:scale-95"
          >
            <Check size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
