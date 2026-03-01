import { useRef, useEffect, useState, type CSSProperties } from 'react';
import { Send } from 'lucide-react';
import type { ChatInputProps } from '../../types';

export function ChatInput({ value, onChange, onSend, onKeyDown }: ChatInputProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [angle, setAngle] = useState(165);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const { width, height } = el.getBoundingClientRect();
      if (!width || !height) return;
      // Angle so highlight goes from bottom-left radius to top-right radius
      const deg = 90 + (Math.atan(width / height) * 180) / Math.PI * 0.85;
      setAngle(Math.round(deg * 10) / 10);
    };
    const ro = new ResizeObserver(update);
    ro.observe(el);
    update();
    return () => ro.disconnect();
  }, []);

  return (
    <div className="absolute bottom-0 left-0 right-0 z-10 flex pointer-events-none">
      <div
        ref={ref}
        className="glass-panel rounded-full p-1 flex items-center h-10 w-full gap-1 pointer-events-auto shadow-sm"
        style={{ '--g-angle': `${angle}deg`, '--g-stop2': '38%', '--g-stop3': '62%', '--glass-border-light': '#d4d4dc' } as CSSProperties}
      >
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Schreibe eine Nachricht..."
          className="flex-1 bg-transparent border-none px-3 text-body text-slate-700 focus:outline-none placeholder:text-slate-400"
        />
        <button
          onClick={onSend}
          className="h-8 w-8 shrink-0 rounded-full flex items-center justify-center transition-all duration-300 neo-btn-gray active:scale-95"
        >
          <Send size={14} style={{ transform: 'translate(-0.5px, 0.5px)' }} />
        </button>
      </div>
    </div>
  );
}
