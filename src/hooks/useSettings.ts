import { useState } from 'react';

const GEMINI_KEY = 'mechanik_gemini_api_key';
const GROQ_KEY   = 'mechanik_groq_api_key';

export function useSettings() {
  const [geminiKey, setGeminiKeyState] = useState<string>(
    () => localStorage.getItem(GEMINI_KEY) ?? ''
  );
  const [groqKey, setGroqKeyState] = useState<string>(
    () => localStorage.getItem(GROQ_KEY) ?? ''
  );

  const saveGeminiKey = (key: string) => {
    localStorage.setItem(GEMINI_KEY, key);
    setGeminiKeyState(key);
  };

  const saveGroqKey = (key: string) => {
    localStorage.setItem(GROQ_KEY, key);
    setGroqKeyState(key);
  };

  return { geminiKey, groqKey, saveGeminiKey, saveGroqKey };
}
