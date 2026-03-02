import { useState, useEffect, useRef } from 'react';
import type { TaskListItem } from '../../hooks/useTaskList';

interface TaskSidebarProps {
  tasks: TaskListItem[];
  currentIndex: number;
  onSelect: (index: number) => void;
  isOpen: boolean;
}

export function TaskSidebar({ tasks, currentIndex, onSelect, isOpen }: TaskSidebarProps) {
  const activeRef = useRef<HTMLButtonElement>(null);
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        setVisible(true);
        activeRef.current?.scrollIntoView({ block: 'center' });
      }));
    } else {
      setVisible(false);
      const t = setTimeout(() => setMounted(false), 200);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  if (!mounted) return null;

  return (
    <div
      className="shrink-0 overflow-x-clip transition-[width,min-width,opacity,margin] duration-200 ease-out"
      style={{
        width: visible ? '22%' : '0',
        minWidth: visible ? '200px' : '0',
        opacity: visible ? 1 : 0,
        marginLeft: visible ? '16px' : '0',
      }}
    >
      <div className="glass-panel-soft panel-radius p-6 flex flex-col h-full min-w-[200px]">
        <div className="flex-1 overflow-y-auto space-y-0.5 pr-1">
          {tasks.map((task, index) => {
            const isActive = index === currentIndex;
            return (
              <button
                key={task.id}
                ref={isActive ? activeRef : undefined}
                onClick={() => onSelect(index)}
                className={`w-full text-left px-3 py-1.5 rounded-full text-body transition-colors flex items-center justify-between gap-2 ${
                  isActive
                    ? 'glass-panel text-slate-800 font-medium'
                    : 'text-slate-600 hover:bg-white/30'
                }`}
              >
                <span className="truncate">
                  <span className="text-slate-400 mr-1.5">{index + 1}</span>
                  {task.title}
                </span>
                <span className={`text-hint shrink-0 ${isActive ? 'text-slate-500' : 'text-slate-400'}`}>
                  {task.total_points}P
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
