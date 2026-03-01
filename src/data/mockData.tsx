import type { Chapter } from '../types';

export const GEMINI_MODEL_ID = 'gemini-2.5-flash';

export const AI_MODELS: { id: string; label: string }[] = [
  { id: 'gemini-3.1-pro-preview', label: '3.1 Pro'   },
  { id: 'gemini-3-flash-preview', label: '3 Flash'   },
  { id: 'gemini-2.5-flash',       label: '2.5 Flash' },
];

export const CHAPTERS: Chapter[] = [
  { id: 1, title: '1. Kinematik des Massenpunktes',  taskCount: 90, completedCount: 0 },
  { id: 2, title: '2. Kinetik des Massenpunktes',    taskCount: 90, completedCount: 0 },
  { id: 3, title: '3. Systeme von Massenpunkten',    taskCount: 92, completedCount: 0 },
];
