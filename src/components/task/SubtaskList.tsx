import { InlineMath } from 'react-katex';
import { SolutionBox } from '../ui';
import type { SubtaskListProps } from '../../types';

export function SubtaskList({ subtasks, isSolved }: SubtaskListProps) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden text-slate-700 space-y-1.5 text-[13px]">
      {subtasks.map((task) => (
        <div key={task.id} className="space-y-0.5">
          <p className="leading-snug">
            {task.description}
          </p>
          <div className="flex items-center flex-wrap text-[13px]">
            <InlineMath math={task.mathPrefix} />
            <SolutionBox solution={task.solution} isSolved={isSolved} />
            <InlineMath math={task.mathSuffix} />
          </div>
        </div>
      ))}
    </div>
  );
}
