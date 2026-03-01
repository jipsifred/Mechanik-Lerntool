import { useState, type KeyboardEvent } from 'react';
import type { Message, ApiTask, AiProvider } from '../types';
import { INITIAL_MESSAGES } from '../data/mockData';

const SYSTEM_INSTRUCTION =
  'Du bist ein Mechanik-Tutor für Ingenieurstudenten. Beantworte Fragen zur Technischen Mechanik präzise und auf Deutsch. Verwende LaTeX-Notation für Formeln: $...$ für Inline-Formeln und $$...$$ für Block-Formeln.';

function buildPrompt(task: ApiTask | null, question: string): string {
  if (!task) return question;
  return [
    `Der Schüler bearbeitet gerade folgende Aufgabe:`,
    `Titel: ${task.title}`,
    task.description ? `Aufgabenstellung: ${task.description}` : '',
    task.given_latex ? `Gegebene Größen (LaTeX): ${task.given_latex}` : '',
    ``,
    `Frage des Schülers: ${question}`,
  ]
    .filter(Boolean)
    .join('\n');
}

async function callGemini(apiKey: string, modelId: string, prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: { message?: string } }).error?.message ?? `HTTP ${res.status}`);
  }
  const data = await res.json() as { candidates: { content: { parts: { text: string }[] } }[] };
  return data.candidates[0].content.parts[0].text;
}

/** Remove <think>…</think> blocks that reasoning models prepend to their output */
function stripThinking(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

async function callGroq(apiKey: string, modelId: string, prompt: string): Promise<string> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelId,
      messages: [
        { role: 'system', content: SYSTEM_INSTRUCTION },
        { role: 'user',   content: prompt },
      ],
      temperature: 0.7,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: { message?: string } }).error?.message ?? `HTTP ${res.status}`);
  }
  const data = await res.json() as { choices: { message: { content: string } }[] };
  return stripThinking(data.choices[0].message.content);
}

const PROVIDER_NAMES: Record<AiProvider, string> = {
  gemini: 'Gemini API Key',
  groq: 'Groq API Key',
};

const PROVIDER_LINKS: Record<AiProvider, string> = {
  gemini: 'aistudio.google.com',
  groq: 'console.groq.com',
};

export function useChat(apiKey: string, taskContext: ApiTask | null, modelId: string, provider: AiProvider) {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [isTyping, setIsTyping] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const addMessage = (text: string, sender: Message['sender']) =>
    setMessages(prev => [...prev, { id: Date.now(), sender, text }]);

  const sendMessage = async () => {
    const text = inputValue.trim();
    if (!text) return;

    addMessage(text, 'user');
    setInputValue('');
    setIsTyping(true);

    try {
      if (!apiKey) {
        addMessage(
          `Bitte gib deinen **${PROVIDER_NAMES[provider]}** in den Einstellungen ein (⚙️ unten links auf der Startseite).\n\nKey bekommst du kostenlos auf **${PROVIDER_LINKS[provider]}**.`,
          'system'
        );
        return;
      }
      const prompt = buildPrompt(taskContext, text);
      const reply = provider === 'gemini'
        ? await callGemini(apiKey, modelId, prompt)
        : await callGroq(apiKey, modelId, prompt);
      addMessage(reply, 'system');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unbekannter Fehler';
      addMessage(`**Fehler:** ${msg}`, 'system');
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
