import { useState, useRef, type KeyboardEvent } from 'react';
import { ChevronLeft, ChevronRight, ArrowLeft, MoreHorizontal, Check } from 'lucide-react';
import { GlassContainer, GlassButton } from '../ui';
import type { HeaderProps } from '../../types';

export function Header({ activePillOption, onPillChange, currentTask, totalTasks, onPrev, onNext, onDashboard, onGoToTask, checkState, onCheckCycle }: HeaderProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const startEditing = () => {
    setEditValue(String(currentTask));
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const commit = () => {
    setEditing(false);
    const num = parseInt(editValue, 10);
    if (!isNaN(num) && num >= 1 && num <= totalTasks) {
      onGoToTask(num - 1);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Escape') {
      setEditing(false);
    }
  };

  return (
    <header className="relative z-10 flex justify-between items-center shrink-0">
      {/* Top Left: Dashboard Button */}
      <GlassContainer className="h-10 w-10 justify-center">
        <GlassButton onClick={onDashboard} className="active:scale-95" title="Zurück zur Übersicht">
          <ArrowLeft size={16} />
        </GlassButton>
      </GlassContainer>

      {/* Top Right: Pills */}
      <div className="flex items-center gap-2">
        <button
          onClick={onCheckCycle}
          title={checkState === 'green' ? 'Korrekt gelöst' : checkState === 'yellow' ? 'Teilweise bearbeitet' : 'Als bearbeitet markieren'}
          className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center transition-all duration-300 active:scale-95 ${
            checkState === 'green' ? 'neo-btn-green' : checkState === 'yellow' ? 'neo-btn-yellow' : 'glassy-button text-slate-400'
          }`}
        >
          <Check size={13} strokeWidth={2.5} />
        </button>
        <GlassContainer className="h-10 gap-0.5 px-1">
          <GlassButton onClick={onPrev} isActive={activePillOption === 'prev'} title="Zurück">
            <ChevronLeft size={16} />
          </GlassButton>
          <span onClick={!editing ? startEditing : undefined} className="text-body font-medium text-slate-600 select-none px-1.5 tabular-nums text-center min-w-[3.5em] cursor-pointer">
            {editing ? (
              <input
                ref={inputRef}
                type="text"
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onBlur={commit}
                onKeyDown={handleKeyDown}
                className="w-6 text-center text-body font-medium text-slate-600 bg-transparent border-none outline-none inline"
                autoFocus
              />
            ) : (
              <>{currentTask}</>
            )}
            {' / '}
            {totalTasks}
          </span>
          <GlassButton onClick={onNext} isActive={activePillOption === 'next'} title="Nächste Aufgabe">
            <ChevronRight size={16} />
          </GlassButton>
        </GlassContainer>

        <GlassContainer className="h-10 gap-0.5">
          <GlassButton onClick={() => onPillChange(activePillOption === 'more' ? '' : 'more')} isActive={activePillOption === 'more'} title="Aufgabenliste">
            <MoreHorizontal size={16} />
          </GlassButton>
        </GlassContainer>
      </div>
    </header>
  );
}
