import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from './useAuth';
import type { UserError } from '../types';

const API = 'http://localhost:7863/api/user/errors';
const DEBOUNCE_MS = 800;

export function useErrors() {
  const { authFetch } = useAuth();
  const [taskErrors, setTaskErrors] = useState<UserError[]>([]);
  const [allErrors, setAllErrors] = useState<UserError[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const authFetchRef = useRef(authFetch);
  const saveTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  // Track the latest note per error id so flushSaves can use it
  const pendingNotes = useRef<Record<number, string>>({});

  useEffect(() => { authFetchRef.current = authFetch; }, [authFetch]);

  const loadTaskErrors = useCallback(async (taskId: number) => {
    setTaskErrors([]);
    try {
      const res = await authFetchRef.current(API);
      if (res.ok) {
        const data = await res.json();
        const errors = (data.errors ?? []) as UserError[];
        setTaskErrors(errors.filter(e => e.task_id === taskId));
      }
    } catch { /* silent */ }
  }, []);

  const loadAllErrors = useCallback(async () => {
    try {
      const res = await authFetchRef.current(API);
      if (res.ok) {
        const data = await res.json();
        setAllErrors(data.errors ?? []);
      }
    } catch { /* silent */ }
  }, []);

  const addError = useCallback(async (taskId: number, note = ''): Promise<UserError | null> => {
    try {
      const res = await authFetchRef.current(API, {
        method: 'POST',
        body: JSON.stringify({ task_id: taskId, note }),
      });
      if (res.ok) {
        const data = await res.json();
        const newError: UserError = {
          id: data.id,
          user_id: 0,
          task_id: taskId,
          subtask_id: null,
          note,
          created_at: Math.floor(Date.now() / 1000),
        };
        setTaskErrors(prev => [...prev, newError]);
        return newError;
      }
    } catch { /* silent */ }
    return null;
  }, []);

  const updateError = useCallback((id: number, note: string) => {
    setTaskErrors(prev => prev.map(e => e.id === id ? { ...e, note } : e));
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

  // Immediately flush all pending saves (call before navigating away)
  const flushSaves = useCallback(async () => {
    const pending = { ...pendingNotes.current };
    const hasPending = Object.keys(pending).length > 0;
    if (!hasPending) return;

    // Cancel all debounce timers
    for (const id of Object.keys(saveTimers.current).map(Number)) {
      clearTimeout(saveTimers.current[id]);
      delete saveTimers.current[id];
    }
    pendingNotes.current = {};

    setSaving(true);
    await Promise.all(
      Object.entries(pending).map(([idStr, note]) =>
        authFetchRef.current(`${API}/${idStr}`, {
          method: 'PUT',
          body: JSON.stringify({ note }),
        }).catch(() => {})
      )
    );
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, []);

  const deleteError = useCallback(async (id: number) => {
    if (saveTimers.current[id]) {
      clearTimeout(saveTimers.current[id]);
      delete saveTimers.current[id];
    }
    delete pendingNotes.current[id];
    try {
      await authFetchRef.current(`${API}/${id}`, { method: 'DELETE' });
      setTaskErrors(prev => prev.filter(e => e.id !== id));
      setAllErrors(prev => prev.filter(e => e.id !== id));
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    return () => {
      Object.values(saveTimers.current).forEach(t => clearTimeout(t));
    };
  }, []);

  return {
    taskErrors,
    allErrors,
    saving,
    saved,
    loadTaskErrors,
    loadAllErrors,
    addError,
    updateError,
    deleteError,
    flushSaves,
  };
}
