import { useState, useEffect, useCallback } from 'react';
import type { ApiTask, ApiSubtask, Subtask } from '../types';

const API_BASE = 'http://localhost:7863';

interface UseTaskReturn {
  task: ApiTask | null;
  subtasks: Subtask[];
  currentIndex: number;
  totalTasks: number;
  loading: boolean;
  goNext: () => void;
  goPrev: () => void;
  goToIndex: (index: number) => void;
}

/** Group API subtasks by formula_group into frontend Subtask rows */
function groupSubtasks(apiSubtasks: ApiSubtask[]): Subtask[] {
  const groups = new Map<number, ApiSubtask[]>();

  for (const s of apiSubtasks) {
    const g = s.formula_group;
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(s);
  }

  const result: Subtask[] = [];

  for (const [, members] of groups) {
    // First member with a label/description provides the row description
    const first = members[0];
    const desc = (first.label ? first.label + ' ' : '') + first.description;

    result.push({
      id: `${first.task_id}-g${first.formula_group}`,
      description: desc,
      fields: members.map((m) => ({
        mathPrefix: m.math_prefix,
        solution: m.solution,
        mathSuffix: m.math_suffix,
      })),
    });
  }

  return result;
}

export function useTask(): UseTaskReturn {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [task, setTask] = useState<ApiTask | null>(null);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [totalTasks, setTotalTasks] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchTask = useCallback(async (index: number) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/tasks/by-index/${index}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTask(data.task);
      setSubtasks(groupSubtasks(data.subtasks));
      setTotalTasks(data.total);
    } catch (err) {
      console.error('Failed to fetch task:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTask(currentIndex);
  }, [currentIndex, fetchTask]);

  const goNext = useCallback(() => {
    setCurrentIndex((i) => (i < totalTasks - 1 ? i + 1 : i));
  }, [totalTasks]);

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => (i > 0 ? i - 1 : i));
  }, []);

  const goToIndex = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  return { task, subtasks, currentIndex, totalTasks, loading, goNext, goPrev, goToIndex };
}
