import { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:7863';

export interface TaskListItem {
  id: number;
  title: string;
  total_points: number;
}

export function useTaskList() {
  const [tasks, setTasks] = useState<TaskListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/tasks`)
      .then(r => r.json())
      .then(data => { setTasks(data.tasks); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return { tasks, loading };
}
