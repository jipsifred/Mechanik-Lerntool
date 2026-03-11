import { useState, useCallback } from 'react';
import type { Flashcard, ShuffleSession } from '../types';

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function hasContent(card: Flashcard): boolean {
  try {
    const secs = JSON.parse(card.back);
    return Array.isArray(secs) && secs.some((s: { content?: string }) => (s.content ?? '').trim().length > 0);
  } catch { return false; }
}

export function useShuffleSession() {
  const [session, setSession] = useState<ShuffleSession | null>(null);

  const startSession = useCallback((cards: Flashcard[]) => {
    const valid = shuffle(cards.filter(hasContent));
    setSession({ queue: valid, totalCards: valid.length, isDone: valid.length === 0 });
  }, []);

  const markGekonnt = useCallback(() => {
    setSession(prev => {
      if (!prev || prev.queue.length === 0) return prev;
      const [, ...rest] = prev.queue;
      return { ...prev, queue: rest, isDone: rest.length === 0 };
    });
  }, []);

  const markNichtGekonnt = useCallback(() => {
    setSession(prev => {
      if (!prev || prev.queue.length === 0) return prev;
      const [current, ...rest] = prev.queue;
      const insertAt = Math.min(4, rest.length);
      return { ...prev, queue: [...rest.slice(0, insertAt), current, ...rest.slice(insertAt)] };
    });
  }, []);

  const endSession = useCallback(() => setSession(null), []);

  return { session, startSession, markGekonnt, markNichtGekonnt, endSession };
}
