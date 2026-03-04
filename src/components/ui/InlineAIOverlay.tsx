import { useState, useRef, useEffect, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';

interface InlineAIOverlayProps {
  position: { top: number; left: number };
  isLoading: boolean;
  hasApiKey: boolean;
  onSubmit: (instruction: string) => void;
  onCancel: () => void;
}

export function InlineAIOverlay({ position, isLoading, hasApiKey, onSubmit, onCancel }: InlineAIOverlayProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const [angle, setAngle] = useState(165);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const el = pillRef.current;
    if (!el) return;
    const update = () => {
      const { width, height } = el.getBoundingClientRect();
      if (!width || !height) return;
      const deg = 90 + (Math.atan(width / height) * 180) / Math.PI * 0.85;
      setAngle(Math.round(deg * 10) / 10);
    };
    const ro = new ResizeObserver(update);
    ro.observe(el);
    update();
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && value.trim()) {
      e.preventDefault();
      e.stopPropagation();
      onSubmit(value.trim());
    }
  };

  const overlay = (
    <div
      className="inline-ai-overlay"
      style={{ position: 'fixed', top: position.top, left: position.left, zIndex: 9999 }}
    >
      <div
        ref={pillRef}
        className="glass-panel rounded-full p-1 flex items-center h-10 gap-1 shadow-sm inline-ai-pill"
        style={{
          '--g-angle': `${angle}deg`,
          '--g-stop2': '38%',
          '--g-stop3': '62%',
        } as CSSProperties}
      >
        <div className="inline-ai-orb-wrap">
          <div className="inline-ai-orb" />
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center px-2">
            <span className="inline-ai-loading-text">Generiert...</span>
          </div>
        ) : !hasApiKey ? (
          <span className="flex-1 text-hint text-slate-400 px-2">API Key in Einstellungen setzen</span>
        ) : (
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="KI-Anweisung..."
            className="flex-1 bg-transparent border-none px-2 pr-3 text-body text-slate-700 focus:outline-none placeholder:text-slate-400"
          />
        )}
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
