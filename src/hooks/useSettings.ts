import { useState } from 'react';
import { GEMINI_MODEL_ID } from '../data/mockData';

const GEMINI_KEY   = 'mechanik_gemini_api_key';
const GEMINI_MODEL = 'mechanik_gemini_model';

export function useSettings() {
  const [geminiKey, setGeminiKeyState] = useState<string>(
    () => localStorage.getItem(GEMINI_KEY) ?? ''
  );

  const [selectedModel, setSelectedModelState] = useState<string>(
    () => localStorage.getItem(GEMINI_MODEL) ?? GEMINI_MODEL_ID
  );

  const saveGeminiKey = (key: string) => {
    localStorage.setItem(GEMINI_KEY, key);
    setGeminiKeyState(key);
  };

  const saveSelectedModel = (model: string) => {
    localStorage.setItem(GEMINI_MODEL, model);
    setSelectedModelState(model);
  };

  return { geminiKey, saveGeminiKey, selectedModel, saveSelectedModel };
}
