import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import type { ApiTask, ApiSubtask, Subtask } from '../types';

const API_BASE = '';

interface UseTaskReturn {
  task: ApiTask | null;
  subtasks: Subtask[];
  apiSubtasks: ApiSubtask[];
  loading: boolean;
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
        subtaskId: m.id,
        mathPrefix: m.math_prefix,
        solution: m.solution,
        mathSuffix: m.math_suffix,
      })),
    });
  }

  return result;
}

export function useTask(taskId: number | null): UseTaskReturn {
  const { authFetch } = useAuth();
  const [task, setTask] = useState<ApiTask | null>(null);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [apiSubtasks, setApiSubtasks] = useState<ApiSubtask[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTask = useCallback(async (id: number) => {
    setLoading(true);
    try {
      const res = await authFetch(`${API_BASE}/api/tasks/${id}`, { method: 'GET' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTask(data.task);
      setApiSubtasks(data.subtasks);
      setSubtasks(groupSubtasks(data.subtasks));
    } catch (err) {
      console.error('Failed to fetch task:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (taskId !== null) {
      fetchTask(taskId);
    }
  }, [taskId, fetchTask]);

  return { task, subtasks, apiSubtasks, loading };
}
