import { useState, useEffect, type KeyboardEvent } from 'react';
import { InlineMath } from 'react-katex';
import { SolutionBox, MarkdownMath } from '../ui';
import type { SubtaskListProps, Subtask } from '../../types';

function countFields(subtasks: Subtask[]): number {
  return subtasks.reduce((sum, t) => sum + t.fields.length, 0);
}

export function SubtaskList({ subtasks }: SubtaskListProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [isSolved, setIsSolved] = useState(false);

  // Reset when subtasks change (new task)
  useEffect(() => {
    setValues({});
    setIsSolved(false);
  }, [subtasks]);

  const totalFields = countFields(subtasks);

  const updateValue = (key: string, val: string) => {
    if (isSolved) return;
    setValues(prev => ({ ...prev, [key]: val }));
  };

  const allFilled = () => {
    if (totalFields === 0) return false;
    let filled = 0;
    for (const task of subtasks) {
      for (let i = 0; i < task.fields.length; i++) {
        if ((values[`${task.id}-${i}`] || '').trim()) filled++;
      }
    }
    return filled === totalFields;
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isSolved && allFilled()) {
      e.preventDefault();
      setIsSolved(true);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto text-slate-700 space-y-1.5 text-body">
      {subtasks.map((task) => (
        <div key={task.id} className="space-y-0.5">
          {task.description && (
            <p className="leading-snug">
              <MarkdownMath text={task.description} />
            </p>
          )}
          <div className="flex items-center flex-wrap text-body">
            {task.fields.map((field, i) => {
              const key = `${task.id}-${i}`;
              return (
                <span key={i} className="inline-flex items-center">
                  {field.mathPrefix && <InlineMath math={field.mathPrefix} />}
                  <SolutionBox
                    solution={field.solution}
                    isSolved={isSolved}
                    value={values[key] || ''}
                    onChange={(val) => updateValue(key, val)}
                    onKeyDown={handleKeyDown}
                  />
                  {field.mathSuffix && <InlineMath math={field.mathSuffix} />}
                </span>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
