import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import type { TaskListItem } from '../types';

const API_BASE = '';

export type { TaskListItem } from '../types';

export function useTaskList() {
  const { authFetch } = useAuth();
  const [tasks, setTasks] = useState<TaskListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await authFetch(`${API_BASE}/api/tasks`, { method: 'GET' });
      const data = await response.json();
      setTasks(data.tasks ?? []);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    const handleRefresh = () => { loadTasks(); };
    window.addEventListener('mechanik:tasks-updated', handleRefresh);
    return () => window.removeEventListener('mechanik:tasks-updated', handleRefresh);
  }, [loadTasks]);

  return { tasks, loading, reload: loadTasks };
}
