import { ChevronLeft, ChevronRight, Check, ArrowLeft, MoreHorizontal } from 'lucide-react';
import { GlassContainer, GlassButton } from '../ui';
import type { HeaderProps } from '../../types';

export function Header({ activePillOption, onPillChange, currentTask, totalTasks, onPrev, onNext, onDashboard }: HeaderProps) {
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
        <GlassContainer className="h-10 gap-0.5 px-1">
          <GlassButton onClick={onPrev} isActive={activePillOption === 'prev'} title="Zurück">
            <ChevronLeft size={16} />
          </GlassButton>
          <span className="text-body font-medium text-slate-600 px-1.5 select-none">
            {currentTask} / {totalTasks}
          </span>
          <GlassButton onClick={onNext} isActive={activePillOption === 'next'} title="Nächste Aufgabe">
            <ChevronRight size={16} />
          </GlassButton>
        </GlassContainer>

        <GlassContainer className="h-10 gap-0.5">
          <GlassButton onClick={() => onPillChange('solve')} isActive={activePillOption === 'solve'} title="Lösen">
            <Check size={16} />
          </GlassButton>
          <GlassButton onClick={() => onPillChange('more')} isActive={activePillOption === 'more'} title="Mehr Optionen">
            <MoreHorizontal size={16} />
          </GlassButton>
        </GlassContainer>
      </div>
    </header>
  );
}
