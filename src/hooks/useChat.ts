import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import type { Message, ApiTask, ApiSubtask } from '../types';

const BASE_SYSTEM_INSTRUCTION =
  `Du bist ein Mechanik-Tutor für Ingenieurstudenten. Beantworte Fragen zur Technischen Mechanik präzise und auf Deutsch. Verwende LaTeX-Notation für Formeln: $...$ für Inline-Formeln und $$...$$ für Block-Formeln.

Kommunikationsregeln:
- Antworte direkt auf die Frage ohne Begrüßung, Einleitung oder Floskeln.
- Kein "Hallo", kein "Gerne helfe ich dir", kein "Lass uns das Schritt für Schritt durchgehen".
- Fang sofort mit dem Inhalt an.
- Schreibe knapp und präzise, nicht ausschweifend.`;

const API_BASE = 'http://localhost:7863';

/* ─── Gemini types ─── */
interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiPart[];
}

/* ─── System instruction with task context & subtasks ─── */
function buildSystemInstruction(task: ApiTask | null, subtasks: ApiSubtask[]): string {
  const lines = [BASE_SYSTEM_INSTRUCTION];

  if (task) {
    lines.push('', '--- Aktuelle Aufgabe ---');
    lines.push(`Titel: ${task.title}`);
    if (task.description) lines.push(`Aufgabenstellung: ${task.description}`);
    if (task.given_latex) lines.push(`Gegebene Größen (LaTeX): ${task.given_latex}`);

    if (subtasks.length > 0) {
      lines.push('', 'Teilaufgaben mit Lösungen:');
      for (const s of subtasks) {
        const desc = (s.label ? s.label + ' ' : '') + s.description;
        const formula = [s.math_prefix, s.solution, s.math_suffix].filter(Boolean).join(' ');
        lines.push(`- ${desc}: ${formula}`);
      }
    }

    lines.push('', 'Wichtig: Gib dem Studenten nicht sofort die Lösung. Führe ihn Schritt für Schritt zur Antwort.');
  }

  return lines.join('\n');
}

/* ─── Fetch image as base64 ─── */
async function fetchImageAsBase64(imageUrl: string): Promise<{ mimeType: string; data: string } | null> {
  try {
    const fullUrl = imageUrl.startsWith('http') ? imageUrl : `${API_BASE}${imageUrl}`;
    const res = await fetch(fullUrl);
    if (!res.ok) return null;

    const blob = await res.blob();
    const mimeType = blob.type || 'image/png';
    const buffer = await blob.arrayBuffer();
    const data = btoa(
      new Uint8Array(buffer).reduce((acc, byte) => acc + String.fromCharCode(byte), '')
    );
    return { mimeType, data };
  } catch {
    return null;
  }
}

/* ─── Convert chat messages to Gemini contents ─── */
function messagesToContents(messages: Message[], imageData: { mimeType: string; data: string } | null): GeminiContent[] {
  // Filter out error messages
  const filtered = messages.filter(m => !(m.sender === 'system' && m.text.startsWith('**Fehler:**')));

  const contents: GeminiContent[] = [];

  for (const msg of filtered) {
    const role: 'user' | 'model' = msg.sender === 'user' ? 'user' : 'model';
    const parts: GeminiPart[] = [{ text: msg.text }];

    // Attach image to the first user message
    if (imageData && role === 'user' && contents.length === 0) {
      parts.unshift({ inlineData: imageData });
    }

    // Merge consecutive same-role messages (Gemini requires alternating roles)
    const last = contents[contents.length - 1];
    if (last && last.role === role) {
      last.parts.push(...parts);
    } else {
      contents.push({ role, parts });
    }
  }

  return contents;
}

/* ─── Main hook ─── */
export function useChat(apiKey: string, taskContext: ApiTask | null, subtasks: ApiSubtask[], modelId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [inputValue, setInputValue] = useState('');

  // Cache image per task
  const imageCacheRef = useRef<{ url: string; data: { mimeType: string; data: string } | null } | null>(null);
  const prevTaskIdRef = useRef<number | null>(null);

  // Reset image cache on task change (chat stays)
  useEffect(() => {
    const taskId = taskContext?.id ?? null;
    if (taskId !== prevTaskIdRef.current) {
      prevTaskIdRef.current = taskId;
      imageCacheRef.current = null;
    }
  }, [taskContext?.id]);

  const getImageData = async (): Promise<{ mimeType: string; data: string } | null> => {
    const imageUrl = taskContext?.image_url;
    if (!imageUrl) return null;

    // Return cached if same URL
    if (imageCacheRef.current && imageCacheRef.current.url === imageUrl) {
      return imageCacheRef.current.data;
    }

    const data = await fetchImageAsBase64(imageUrl);
    imageCacheRef.current = { url: imageUrl, data };
    return data;
  };

  const sendMessage = async () => {
    const text = inputValue.trim();
    if (!text) return;

    const userMsg: Message = { id: Date.now(), sender: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    try {
      if (!apiKey) {
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          sender: 'system',
          text: `Bitte gib deinen **Gemini API Key** in den Einstellungen ein (unten links auf der Startseite).\n\nKey bekommst du kostenlos auf **aistudio.google.com**.`,
        }]);
        return;
      }

      // Build contents with full chat history + new message
      const imageData = await getImageData();
      const allMessages = [...messages, userMsg];
      const contents = messagesToContents(allMessages, imageData);

      const systemInstruction = buildSystemInstruction(taskContext, subtasks);

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: { message?: string } }).error?.message ?? `HTTP ${res.status}`);
      }

      const data = await res.json() as { candidates: { content: { parts: { text: string }[] } }[] };
      const reply = data.candidates[0].content.parts[0].text;

      setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'system', text: reply }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unbekannter Fehler';
      setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'system', text: `**Fehler:** ${msg}` }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return { messages, isTyping, inputValue, setInputValue, sendMessage, handleKeyDown };
}
