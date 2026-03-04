import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

const API_BASE = 'http://localhost:7863';

export interface TaskListItem {
  id: number;
  title: string;
  total_points: number;
  category: string;
}

export function useTaskList() {
  const { authFetch } = useAuth();
  const [tasks, setTasks] = useState<TaskListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch(`${API_BASE}/api/tasks`, { method: 'GET' })
      .then(r => r.json())
      .then(data => { setTasks(data.tasks); setLoading(false); })
      .catch(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { tasks, loading };
}
