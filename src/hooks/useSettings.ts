import { useState, useEffect } from 'react';
import { GEMINI_MODEL_ID } from '../data/mockData';

const GEMINI_KEY   = 'mechanik_gemini_api_key';
const GEMINI_MODEL = 'mechanik_gemini_model';
const DARK_MODE    = 'mechanik_dark_mode';

export function useSettings() {
  const [geminiKey, setGeminiKeyState] = useState<string>(
    () => localStorage.getItem(GEMINI_KEY) ?? ''
  );

  const [selectedModel, setSelectedModelState] = useState<string>(
    () => localStorage.getItem(GEMINI_MODEL) ?? GEMINI_MODEL_ID
  );

  const [darkMode, setDarkModeState] = useState<boolean>(
    () => localStorage.getItem(DARK_MODE) === 'true'
  );

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : '';
  }, [darkMode]);

  const saveGeminiKey = (key: string) => {
    localStorage.setItem(GEMINI_KEY, key);
    setGeminiKeyState(key);
  };

  const saveSelectedModel = (model: string) => {
    localStorage.setItem(GEMINI_MODEL, model);
    setSelectedModelState(model);
  };

  const toggleDarkMode = () => {
    setDarkModeState(prev => {
      const next = !prev;
      localStorage.setItem(DARK_MODE, String(next));
      return next;
    });
  };

  return { geminiKey, saveGeminiKey, selectedModel, saveSelectedModel, darkMode, toggleDarkMode };
}
