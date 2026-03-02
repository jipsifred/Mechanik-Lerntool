import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';

const API_BASE = 'http://localhost:7863';

interface TaskProgress {
  task_id: number;
  status: 'untouched' | 'in_progress' | 'done';
  last_seen_at: number | null;
}

interface SubtaskProgress {
  subtask_id: number;
  is_solved: number;
  solved_at: number | null;
}

interface UserProgress {
  taskProgress: TaskProgress[];
  subtaskProgress: SubtaskProgress[];
}

export function useUserProgress() {
  const { authFetch } = useAuth();
  const [progress, setProgress] = useState<UserProgress>({ taskProgress: [], subtaskProgress: [] });

  const loadProgress = useCallback(async () => {
    try {
      const res = await authFetch(`${API_BASE}/api/user/progress`);
      if (res.ok) {
        const data = await res.json();
        setProgress(data);
      }
    } catch {
      // Progress load is non-critical
    }
  }, [authFetch]);

  const markTaskInProgress = useCallback(async (taskId: number) => {
    try {
      await authFetch(`${API_BASE}/api/user/progress/task/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'in_progress' }),
      });
    } catch {}
  }, [authFetch]);

  const markTaskDone = useCallback(async (taskId: number) => {
    try {
      await authFetch(`${API_BASE}/api/user/progress/task/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'done' }),
      });
    } catch {}
  }, [authFetch]);

  const markSubtaskSolved = useCallback(async (subtaskId: number) => {
    setProgress(prev => ({
      ...prev,
      subtaskProgress: prev.subtaskProgress.some(s => s.subtask_id === subtaskId)
        ? prev.subtaskProgress.map(s =>
            s.subtask_id === subtaskId ? { ...s, is_solved: 1 } : s
          )
        : [...prev.subtaskProgress, { subtask_id: subtaskId, is_solved: 1, solved_at: null }],
    }));
    try {
      await authFetch(`${API_BASE}/api/user/progress/subtask/${subtaskId}`, {
        method: 'PUT',
        body: JSON.stringify({ is_solved: true }),
      });
    } catch {}
  }, [authFetch]);

  const isSubtaskSolved = useCallback(
    (subtaskId: number) =>
      progress.subtaskProgress.some(s => s.subtask_id === subtaskId && s.is_solved === 1),
    [progress.subtaskProgress]
  );

  return { progress, loadProgress, markTaskInProgress, markTaskDone, markSubtaskSolved, isSubtaskSolved };
}
