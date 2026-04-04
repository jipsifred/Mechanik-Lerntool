import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import type { CustomTaskCategory } from '../types';

const API = '/api/user/custom-library';

function broadcastTaskUpdate() {
  window.dispatchEvent(new Event('mechanik:tasks-updated'));
}

export function useCustomTaskLibrary() {
  const { authFetch } = useAuth();
  const [categories, setCategories] = useState<CustomTaskCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`${API}/categories`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setCategories(data.categories ?? []);
    } catch {
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    const handleRefresh = () => { loadCategories(); };
    window.addEventListener('mechanik:tasks-updated', handleRefresh);
    return () => window.removeEventListener('mechanik:tasks-updated', handleRefresh);
  }, [loadCategories]);

  const createCategory = useCallback(async (title: string, description = '') => {
    const res = await authFetch(`${API}/categories`, {
      method: 'POST',
      body: JSON.stringify({ title, description }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error ?? 'Kategorie konnte nicht erstellt werden.');
    }

    await loadCategories();
    broadcastTaskUpdate();
    return data.category as CustomTaskCategory;
  }, [authFetch, loadCategories]);

  const createTask = useCallback(async (categoryId: number, taskJson: string, imageDataUrl: string | null) => {
    const res = await authFetch(`${API}/tasks`, {
      method: 'POST',
      body: JSON.stringify({
        category_id: categoryId,
        task_json: taskJson,
        image_data_url: imageDataUrl,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error ?? 'Aufgabe konnte nicht gespeichert werden.');
    }

    await loadCategories();
    broadcastTaskUpdate();
    return data.task as { id: number; category: string; title: string; total_points: number };
  }, [authFetch, loadCategories]);

  const loadTaskForEdit = useCallback(async (taskId: number) => {
    const res = await authFetch(`${API}/tasks/${taskId}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error ?? 'Aufgabe konnte nicht geladen werden.');
    }
    return data.task as {
      id: number;
      category_id: number;
      category_code: string;
      task_json: string;
      image_data_url: string | null;
    };
  }, [authFetch]);

  const updateTask = useCallback(async (taskId: number, categoryId: number, taskJson: string, imageDataUrl: string | null) => {
    const res = await authFetch(`${API}/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify({
        category_id: categoryId,
        task_json: taskJson,
        image_data_url: imageDataUrl,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error ?? 'Aufgabe konnte nicht aktualisiert werden.');
    }

    await loadCategories();
    broadcastTaskUpdate();
    return data.task as { id: number; category: string; title: string; total_points: number };
  }, [authFetch, loadCategories]);

  return {
    categories,
    loading,
    reload: loadCategories,
    createCategory,
    createTask,
    loadTaskForEdit,
    updateTask,
  };
}
