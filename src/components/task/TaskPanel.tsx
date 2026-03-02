import { BlockMath } from 'react-katex';
import { MarkdownMath } from '../ui';
import type { TaskPanelProps } from '../../types';

export function TaskPanel({ title, description, givenLatex, imageUrl }: TaskPanelProps) {
  return (
    <div className="flex-1 glass-panel-soft panel-radius p-6 flex flex-col min-h-0 min-w-0">
      <h2 className="text-title font-semibold mb-3 text-slate-800 shrink-0">{title}</h2>
      <div className="flex-1 flex flex-col overflow-hidden text-slate-700 space-y-2 text-body">
        <p className="leading-snug shrink-0">
          <MarkdownMath text={description} />
        </p>
        {givenLatex && (
          <>
            <p className="font-medium shrink-0">Gegeben:</p>
            <div className="shrink-0">
              <BlockMath math={givenLatex} />
            </div>
          </>
        )}
        {imageUrl && (
          <div className="flex-1 min-h-0 flex items-center justify-center pt-2">
            <img
              src={imageUrl}
              alt="Skizze zur Aufgabe"
              className="max-h-full max-w-full object-contain rounded-lg"
              referrerPolicy="no-referrer"
            />
          </div>
        )}
      </div>
    </div>
  );
}
