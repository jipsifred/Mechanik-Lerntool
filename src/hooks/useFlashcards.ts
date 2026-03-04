import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from './useAuth';
import type { Flashcard, FlashcardSection, Subtask } from '../types';

const API = 'http://localhost:7863/api/user/flashcards';
const DEBOUNCE_MS = 1500;

export function useFlashcards() {
  const { authFetch } = useAuth();
  const [currentCard, setCurrentCard] = useState<Flashcard | null>(null);
  const [sections, setSections] = useState<FlashcardSection[]>([]);
  const [allCards, setAllCards] = useState<Flashcard[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentTaskIdRef = useRef<number | null>(null);
  const frontRef = useRef<string>('');
  const sectionsRef = useRef<FlashcardSection[]>([]);
  const authFetchRef = useRef(authFetch);

  // Keep refs always up-to-date
  useEffect(() => { authFetchRef.current = authFetch; }, [authFetch]);
  useEffect(() => { sectionsRef.current = sections; }, [sections]);

  const parseSections = (back: string): FlashcardSection[] => {
    try {
      const parsed = JSON.parse(back);
      if (Array.isArray(parsed)) return parsed;
    } catch { /* not JSON */ }
    return [];
  };

  const doSave = useCallback(async () => {
    const taskId = currentTaskIdRef.current;
    const front = frontRef.current;
    const secs = sectionsRef.current;
    console.log('[flashcard] doSave called', { taskId, front: front?.slice(0, 30), sectionsCount: secs.length });
    if (!taskId || !front) {
      console.warn('[flashcard] doSave aborted: missing taskId or front', { taskId, front });
      return;
    }

    setSaving(true);
    setSaved(false);
    try {
      const res = await authFetchRef.current(`${API}/by-task/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify({ front, back: JSON.stringify(secs) }),
      });
      console.log('[flashcard] save response', res.status);
      if (res.ok) {
        const data = await res.json();
        setCurrentCard(data.flashcard);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (err) {
      console.error('[flashcard] save failed:', err);
    }
    setSaving(false);
  }, []);

  const triggerAutoSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(doSave, DEBOUNCE_MS);
  }, [doSave]);

  const loadCardForTask = useCallback(async (taskId: number): Promise<Flashcard | null> => {
    try {
      const res = await authFetchRef.current(`${API}/by-task/${taskId}`);
      if (res.ok) {
        const data = await res.json();
        const card = data.flashcard as Flashcard;
        setCurrentCard(card);
        const secs = parseSections(card.back);
        setSections(secs);
        frontRef.current = card.front;
        return card;
      }
    } catch { /* not found or network error */ }
    return null;
  }, []);

  const initCardForTask = useCallback(async (taskId: number, front: string, subtasks: Subtask[]) => {
    const templateSections: FlashcardSection[] = subtasks.map((st) => ({
      label: st.description,
      content: '',
    }));
    setSections(templateSections);
    sectionsRef.current = templateSections;

    setSaving(true);
    try {
      const res = await authFetchRef.current(`${API}/by-task/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify({ front, back: JSON.stringify(templateSections) }),
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentCard(data.flashcard);
      }
    } catch (err) {
      console.error('Flashcard init failed:', err);
    }
    setSaving(false);
  }, []);

  const loadOrInitCard = useCallback(async (taskId: number, front: string, subtasks: Subtask[]) => {
    console.log('[flashcard] loadOrInitCard', { taskId, front: front?.slice(0, 30), subtaskCount: subtasks.length });
    // Cancel any pending save for the previous task
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    // Set refs immediately (before any async work)
    currentTaskIdRef.current = taskId;
    frontRef.current = front;

    // Clear UI state
    setCurrentCard(null);
    setSections([]);
    setSaved(false);

    const existing = await loadCardForTask(taskId);
    console.log('[flashcard] existing card:', existing ? 'found' : 'not found');
    if (!existing) {
      await initCardForTask(taskId, front, subtasks);
    }
  }, [loadCardForTask, initCardForTask]);

  const updateSection = useCallback((index: number, content: string) => {
    console.log('[flashcard] updateSection', index, content.slice(0, 50));
    setSections(prev => {
      const next = [...prev];
      if (next[index]) {
        next[index] = { ...next[index], content };
      }
      // Sync ref immediately so auto-save picks up latest
      sectionsRef.current = next;
      return next;
    });
    setSaved(false);
    // Only need taskId to auto-save (front is in frontRef)
    if (currentTaskIdRef.current) {
      console.log('[flashcard] triggerAutoSave for task', currentTaskIdRef.current);
      triggerAutoSave();
    } else {
      console.warn('[flashcard] no currentTaskId, skipping auto-save');
    }
  }, [triggerAutoSave]);

  const loadAllCards = useCallback(async () => {
    try {
      const res = await authFetchRef.current(API);
      if (res.ok) {
        const data = await res.json();
        setAllCards(data.flashcards ?? []);
      }
    } catch { /* silent */ }
  }, []);

  const deleteCard = useCallback(async (id: number) => {
    try {
      await authFetchRef.current(`${API}/${id}`, { method: 'DELETE' });
      setAllCards(prev => prev.filter(c => c.id !== id));
      if (currentCard?.id === id) {
        setCurrentCard(null);
        setSections([]);
      }
    } catch { /* silent */ }
  }, [currentCard]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  return {
    currentCard,
    sections,
    allCards,
    saving,
    saved,
    loadOrInitCard,
    updateSection,
    loadAllCards,
    deleteCard,
    parseSections,
  };
}
