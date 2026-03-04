import { useState, useEffect, useCallback } from 'react';
import { InlineMath } from 'react-katex';
import { SolutionBox, MarkdownMath } from '../ui';
import type { SubtaskListProps, ApiSubtask } from '../../types';

interface SubtaskListExtendedProps extends SubtaskListProps {
  apiSubtasks?: ApiSubtask[];
  onSubtaskSolved?: (subtaskId: number) => void;
  isSubtaskSolved?: (subtaskId: number) => boolean;
  onChecked?: (state: 'green' | 'yellow') => void;
}

export function SubtaskList({ subtasks, onSubtaskSolved, onChecked }: SubtaskListExtendedProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [isSolved, setIsSolved] = useState(false);

  useEffect(() => {
    setValues({});
    setIsSolved(false);
  }, [subtasks]);

  const updateValue = (key: string, val: string) => {
    if (isSolved) return;
    setValues(prev => ({ ...prev, [key]: val }));
  };

  const toggle = useCallback(() => {
    if (isSolved) {
      setIsSolved(false);
      return;
    }

    let correctCount = 0;
    let filledCount = 0;
    let totalCount = 0;

    for (const task of subtasks) {
      task.fields.forEach((field, i) => {
        totalCount++;
        const val = (values[`${task.id}-${i}`] || '').trim().replace('.', ',');
        if (val) filledCount++;
        if (val === field.solution.trim().replace('.', ',')) {
          correctCount++;
          onSubtaskSolved?.(field.subtaskId);
        }
      });
    }

    setIsSolved(true);

    if (totalCount === 0) return;
    onChecked?.(correctCount === totalCount ? 'green' : 'yellow');
  }, [isSolved, subtasks, values, onSubtaskSolved, onChecked]);

  // Global Enter listener — fires even when no input is focused
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      const el = e.target as HTMLInputElement;
      if (el.tagName === 'INPUT' && !el.readOnly) return;
      if (el.tagName === 'TEXTAREA' || el.isContentEditable) return;
      e.preventDefault();
      toggle();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggle]);

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
