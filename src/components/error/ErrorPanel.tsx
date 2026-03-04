import { useRef, useEffect, useState, type CSSProperties } from 'react';
import { Plus, Trash2, Check } from 'lucide-react';
import { MilkdownEditor } from '../ui';
import { ErrorIcon } from '../icons';
import type { UserError } from '../../types';

interface ErrorPanelProps {
  taskId: number;
  errors: UserError[];
  saving: boolean;
  saved: boolean;
  onLoad: (taskId: number) => void;
  onAdd: (taskId: number, note?: string) => Promise<UserError | null>;
  onUpdate: (id: number, note: string) => void;
  onDelete: (id: number) => void;
}

function AddErrorPill({ onAdd }: { onAdd: (note: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [angle, setAngle] = useState(165);
  const [value, setValue] = useState('');

  useEffect(() => {
    const el = ref.current;
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

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setValue('');
  };

  return (
    <div className="flex">
      <div
        ref={ref}
        className="glass-panel rounded-full p-1 flex items-center h-10 w-full gap-1 shadow-sm"
        style={{ '--g-angle': `${angle}deg`, '--g-stop2': '38%', '--g-stop3': '62%', '--glass-border-light': '#d4d4dc' } as CSSProperties}
      >
        <input
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submit(); }}
          placeholder="Fehler hinzufügen..."
          className="flex-1 bg-transparent border-none px-3 text-body text-slate-700 focus:outline-none placeholder:text-slate-400"
        />
        <button
          onClick={submit}
          className="h-8 w-8 shrink-0 rounded-full flex items-center justify-center transition-all duration-300 neo-btn-gray active:scale-95"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

export function ErrorPanel({
  taskId,
  errors,
  saving,
  saved,
  onLoad,
  onAdd,
  onUpdate,
  onDelete,
}: ErrorPanelProps) {
  const [newestErrorId, setNewestErrorId] = useState<number | null>(null);

  useEffect(() => {
    if (taskId) onLoad(taskId);
  }, [taskId]);

  const handleAdd = async (note: string) => {
    const created = await onAdd(taskId, note);
    if (created) setNewestErrorId(created.id);
  };

  const multiple = errors.length > 1;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Error list */}
      <div className="flex-1 overflow-y-auto pr-1">
        {errors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-slate-400 gap-2">
            <ErrorIcon className="w-10 h-10 text-slate-300" />
            <p className="text-body">Noch keine Fehler eingetragen.</p>
          </div>
        ) : (
          <div className="bg-white/40 rounded-xl border border-white/60 overflow-hidden">
            {errors.map((error, index) => (
              <div
                key={error.id}
                className={`p-3 flex items-start gap-2 ${multiple && index > 0 ? 'border-t border-slate-200/60' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  <MilkdownEditor
                    key={error.id}
                    defaultValue={error.note ?? ''}
                    onChange={(md) => onUpdate(error.id, md)}
                    placeholder="Beschreibe deinen Fehler... (LaTeX mit $Formel$)"
                    autoFocus={error.id === newestErrorId}
                  />
                </div>
                <button
                  onClick={() => onDelete(error.id)}
                  className="text-slate-300 hover:text-red-400 transition-colors shrink-0 mt-1.5"
                  title="Fehler löschen"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Save indicator */}
      <div className="relative shrink-0">
        <span className={`absolute -top-5 right-0 text-hint flex items-center gap-1 transition-opacity duration-300 ${
          saving ? 'opacity-100 text-slate-400' : saved ? 'opacity-100 text-emerald-500' : 'opacity-0 text-emerald-500'
        }`}>
          <Check size={12} />
          {saving ? 'Speichern...' : 'Gespeichert'}
        </span>
      </div>

      {/* Add error pill */}
      <div className="shrink-0 pt-3">
        <AddErrorPill onAdd={handleAdd} />
      </div>
    </div>
  );
}
