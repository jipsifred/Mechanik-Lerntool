import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from './useAuth';
import type { UserFormula } from '../types';

const API = '/api/user/formulas';
const DEBOUNCE_MS = 800;

export function useFormulas() {
  const { authFetch } = useAuth();
  const [taskFormulas, setTaskFormulas] = useState<UserFormula[]>([]);
  const [allFormulas, setAllFormulas] = useState<UserFormula[]>([]);
  const [chapterFormula, setChapterFormula] = useState<UserFormula | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const authFetchRef = useRef(authFetch);
  const saveTimers = useRef<Record<number | string, ReturnType<typeof setTimeout>>>({});
  const pendingNotes = useRef<Record<number | string, string>>({});

  useEffect(() => { authFetchRef.current = authFetch; }, [authFetch]);

  const loadTaskFormulas = useCallback(async (taskId: number) => {
    setTaskFormulas([]);
    try {
      const res = await authFetchRef.current(API);
      if (res.ok) {
        const data = await res.json();
        const formulas = (data.formulas ?? []) as UserFormula[];
        setTaskFormulas(formulas.filter(f => f.task_id === taskId));
      }
    } catch { /* silent */ }
  }, []);

  const loadAllFormulas = useCallback(async () => {
    try {
      const res = await authFetchRef.current(API);
      if (res.ok) {
        const data = await res.json();
        setAllFormulas(data.formulas ?? []);
      }
    } catch { /* silent */ }
  }, []);

  const addFormula = useCallback(async (taskId: number, note = ''): Promise<UserFormula | null> => {
    try {
      const res = await authFetchRef.current(API, {
        method: 'POST',
        body: JSON.stringify({ task_id: taskId, note }),
      });
      if (res.ok) {
        const data = await res.json();
        const newFormula: UserFormula = {
          id: data.id,
          user_id: 0,
          task_id: taskId,
          subtask_id: null,
          category: null,
          note,
          created_at: Math.floor(Date.now() / 1000),
        };
        setTaskFormulas(prev => [...prev, newFormula]);
        return newFormula;
      }
    } catch { /* silent */ }
    return null;
  }, []);

  const updateFormula = useCallback((id: number, note: string) => {
    setTaskFormulas(prev => prev.map(f => f.id === id ? { ...f, note } : f));
    setSaved(false);
    pendingNotes.current[id] = note;
    if (saveTimers.current[id]) clearTimeout(saveTimers.current[id]);
    saveTimers.current[id] = setTimeout(async () => {
      delete saveTimers.current[id];
      const latestNote = pendingNotes.current[id];
      delete pendingNotes.current[id];
      setSaving(true);
      try {
        await authFetchRef.current(`${API}/${id}`, {
          method: 'PUT',
          body: JSON.stringify({ note: latestNote }),
        });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch { /* silent */ }
      setSaving(false);
    }, DEBOUNCE_MS);
  }, []);

  const loadChapterFormula = useCallback(async (category: string) => {
    setChapterFormula(null);
    try {
      const res = await authFetchRef.current(`${API}/chapter/${encodeURIComponent(category)}`);
      if (res.ok) {
        const data = await res.json();
        setChapterFormula(data.formula ?? null);
      }
    } catch { /* silent */ }
  }, []);

  const updateChapterFormula = useCallback((category: string, note: string) => {
    setChapterFormula(prev => prev ? { ...prev, note } : {
      id: 0, user_id: 0, task_id: null, subtask_id: null, category, note, created_at: Math.floor(Date.now() / 1000),
    });
    setSaved(false);
    const key = `chapter_${category}`;
    pendingNotes.current[key] = note;
    if (saveTimers.current[key]) clearTimeout(saveTimers.current[key]);
    saveTimers.current[key] = setTimeout(async () => {
      delete saveTimers.current[key];
      const latestNote = pendingNotes.current[key];
      delete pendingNotes.current[key];
      setSaving(true);
      try {
        const res = await authFetchRef.current(`${API}/chapter`, {
          method: 'POST',
          body: JSON.stringify({ category, note: latestNote }),
        });
        if (res.ok) {
          const data = await res.json();
          setChapterFormula(data.formula);
        }
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch { /* silent */ }
      setSaving(false);
    }, DEBOUNCE_MS);
  }, []);

  const flushSaves = useCallback(async () => {
    const pending = { ...pendingNotes.current };
    const hasPending = Object.keys(pending).length > 0;
    if (!hasPending) return;

    for (const key of Object.keys(saveTimers.current)) {
      clearTimeout(saveTimers.current[key as any]);
      delete saveTimers.current[key as any];
    }
    pendingNotes.current = {};

    setSaving(true);
    await Promise.all(
      Object.entries(pending).map(([key, note]) => {
        if (key.startsWith('chapter_')) {
          const category = key.slice('chapter_'.length);
          return authFetchRef.current(`${API}/chapter`, {
            method: 'POST',
            body: JSON.stringify({ category, note }),
          }).catch(() => {});
        }
        return authFetchRef.current(`${API}/${key}`, {
          method: 'PUT',
          body: JSON.stringify({ note }),
        }).catch(() => {});
      })
    );
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, []);

  const deleteFormula = useCallback(async (id: number) => {
    if (saveTimers.current[id]) {
      clearTimeout(saveTimers.current[id]);
      delete saveTimers.current[id];
    }
    delete pendingNotes.current[id];
    try {
      await authFetchRef.current(`${API}/${id}`, { method: 'DELETE' });
      setTaskFormulas(prev => prev.filter(f => f.id !== id));
      setAllFormulas(prev => prev.filter(f => f.id !== id));
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    return () => {
      Object.values(saveTimers.current).forEach(t => clearTimeout(t));
    };
  }, []);

  return {
    taskFormulas,
    allFormulas,
    chapterFormula,
    saving,
    saved,
    loadTaskFormulas,
    loadAllFormulas,
    loadChapterFormula,
    updateChapterFormula,
    addFormula,
    updateFormula,
    deleteFormula,
    flushSaves,
  };
}
