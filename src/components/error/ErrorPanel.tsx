import { useEffect, useState } from 'react';
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
  onAdd: (taskId: number) => Promise<UserError | null>;
  onUpdate: (id: number, note: string) => void;
  onDelete: (id: number) => void;
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

  const handleAdd = async () => {
    const created = await onAdd(taskId);
    if (created) setNewestErrorId(created.id);
  };

  const multiple = errors.length > 1;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Save indicator */}
      <div className="h-5 flex items-center justify-between mb-1 shrink-0">
        <span className="text-hint text-slate-400">Fehler für diese Aufgabe</span>
        <span className={`text-hint flex items-center gap-1 transition-opacity duration-300 ${
          saving ? 'opacity-100 text-slate-400' : saved ? 'opacity-100 text-emerald-500' : 'opacity-0 text-emerald-500'
        }`}>
          <Check size={12} />
          {saving ? 'Speichern...' : 'Gespeichert'}
        </span>
      </div>

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
                className={`p-3 flex flex-col gap-2 ${multiple && index > 0 ? 'border-t border-slate-200/60' : ''}`}
              >
                <div className="flex items-center justify-between shrink-0">
                  <span className="text-label text-red-400 flex items-center gap-1.5 font-medium">
                    <ErrorIcon className="w-3.5 h-3.5" />
                    {multiple ? `Fehler ${index + 1}` : 'Fehler'}
                  </span>
                  <button
                    onClick={() => onDelete(error.id)}
                    className="text-slate-300 hover:text-red-400 transition-colors"
                    title="Fehler löschen"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <MilkdownEditor
                  key={error.id}
                  defaultValue={error.note ?? ''}
                  onChange={(md) => onUpdate(error.id, md)}
                  placeholder="Beschreibe deinen Fehler... (LaTeX mit $Formel$)"
                  autoFocus={error.id === newestErrorId}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add button */}
      <div className="shrink-0 pt-3">
        <button
          onClick={handleAdd}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-body font-medium neo-btn-gray transition-all duration-200"
        >
          <Plus size={16} />
          Fehler hinzufügen
        </button>
      </div>
    </div>
  );
}
