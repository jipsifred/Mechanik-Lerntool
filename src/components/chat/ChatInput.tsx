import { Send } from 'lucide-react';
import { GlassContainer, GlassButton } from '../ui';
import type { ChatInputProps } from '../../types';

export function ChatInput({ value, onChange, onSend, onKeyDown }: ChatInputProps) {
  return (
    <div className="absolute bottom-0 left-0 right-0 z-10 flex pointer-events-none">
      <GlassContainer className="h-10 w-full gap-1 pointer-events-auto shadow-sm">
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Schreibe eine Nachricht..."
          className="flex-1 bg-transparent border-none px-3 text-body text-slate-700 focus:outline-none placeholder:text-slate-400"
        />
        <GlassButton onClick={onSend} className="active:scale-95">
          <Send size={14} style={{ transform: 'translate(-0.5px, 0.5px)' }} />
        </GlassButton>
      </GlassContainer>
    </div>
  );
}
