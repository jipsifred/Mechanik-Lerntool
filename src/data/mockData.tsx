import type { Message, Chapter, AiModel } from '../types';

export const INITIAL_MESSAGES: Message[] = [
  {
    id: 1,
    sender: 'system',
    text: 'Hallo! Ich bin dein Tutor. Hast du Fragen zur Berechnung der **d\'Alembertschen Hilfskräfte**?\n\nDie Formel lautet: $$F_H = -m \\cdot a$$',
  },
  {
    id: 2,
    sender: 'user',
    text: 'Wie komme ich auf die 0,85 bei Teilaufgabe a?',
  },
];

export const MOCK_RESPONSE =
  'Das ist eine simulierte Antwort nach 7 Sekunden. Um auf die Werte zu kommen, musst du die Masse mit der Beschleunigung multiplizieren. Denke daran, dass $F_H = -m \\cdot \\ddot{x}$ gilt.';

export const AI_MODELS: AiModel[] = [
  // Google Gemini
  { id: 'gemini-2.5-flash',     label: '2.5 Flash',          provider: 'gemini' },
  { id: 'gemini-2.5-pro',       label: '2.5 Pro',            provider: 'gemini' },
  { id: 'gemini-2.0-flash',     label: '2.0 Flash',          provider: 'gemini' },
  { id: 'gemini-2.0-flash-lite',label: '2.0 Flash Lite',     provider: 'gemini' },
  { id: 'gemini-1.5-pro',       label: '1.5 Pro',            provider: 'gemini' },
  // Groq (kostenlos) — Reasoning
  { id: 'deepseek-r1-distill-llama-70b', label: 'DeepSeek R1 70B (Reasoning)', provider: 'groq' },
  { id: 'qwen-qwq-32b',                  label: 'QwQ 32B (Reasoning)',          provider: 'groq' },
  { id: 'qwen/qwen3-32b',                label: 'Qwen3 32B (Reasoning)',        provider: 'groq' },
  // Groq (kostenlos) — Allgemein
  { id: 'llama-3.3-70b-versatile',       label: 'Llama 3.3 70B',               provider: 'groq' },
  { id: 'llama-3.1-8b-instant',          label: 'Llama 3.1 8B (schnell)',       provider: 'groq' },
];

export const DEFAULT_MODEL_ID = 'deepseek-r1-distill-llama-70b';

export const CHAPTERS: Chapter[] = [
  { id: 1, title: '1. Kinematik des Massenpunktes', taskCount: 90, completedCount: 0 },
  { id: 2, title: '2. Kinetik des Massenpunktes', taskCount: 90, completedCount: 0 },
  { id: 3, title: '3. Systeme von Massenpunkten', taskCount: 92, completedCount: 0 },
];
