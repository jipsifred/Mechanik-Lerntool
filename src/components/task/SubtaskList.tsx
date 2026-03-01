import { InlineMath } from 'react-katex';
import { SolutionBox, MarkdownMath } from '../ui';
import type { SubtaskListProps } from '../../types';

export function SubtaskList({ subtasks, isSolved }: SubtaskListProps) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden text-slate-700 space-y-1.5 text-body">
      {subtasks.map((task) => (
        <div key={task.id} className="space-y-0.5">
          {task.description && (
            <p className="leading-snug">
              <MarkdownMath text={task.description} />
            </p>
          )}
          <div className="flex items-center flex-wrap text-body">
            {task.fields.map((field, i) => (
              <span key={i} className="inline-flex items-center">
                {field.mathPrefix && <InlineMath math={field.mathPrefix} />}
                <SolutionBox solution={field.solution} isSolved={isSolved} />
                {field.mathSuffix && <InlineMath math={field.mathSuffix} />}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
