import { useState, useEffect, useCallback, useRef } from 'react';
import { GEMINI_MODEL_ID } from '../data/mockData';
import { useAuth } from './useAuth';
import type { AIPromptContext } from '../types';

const GEMINI_KEY   = 'mechanik_gemini_api_key';
const GEMINI_MODEL = 'mechanik_gemini_model';
const DARK_MODE    = 'mechanik_dark_mode';

const PROMPT_KEYS: Record<AIPromptContext, string> = {
  chat: 'mechanik_prompt_chat',
  karteikarten: 'mechanik_prompt_karteikarten',
  fehler: 'mechanik_prompt_fehler',
  formeln: 'mechanik_prompt_formeln',
};

const API = '/api/user/custom-prompts';
const DEBOUNCE_MS = 800;

function loadLocalPrompts(): Record<AIPromptContext, string> {
  return {
    chat: localStorage.getItem(PROMPT_KEYS.chat) ?? '',
    karteikarten: localStorage.getItem(PROMPT_KEYS.karteikarten) ?? '',
    fehler: localStorage.getItem(PROMPT_KEYS.fehler) ?? '',
    formeln: localStorage.getItem(PROMPT_KEYS.formeln) ?? '',
  };
}

export function useSettings() {
  const { authFetch } = useAuth();
  const authFetchRef = useRef(authFetch);
  useEffect(() => { authFetchRef.current = authFetch; }, [authFetch]);

  const [geminiKey, setGeminiKeyState] = useState<string>(
    () => localStorage.getItem(GEMINI_KEY) ?? ''
  );

  const [selectedModel, setSelectedModelState] = useState<string>(
    () => localStorage.getItem(GEMINI_MODEL) ?? GEMINI_MODEL_ID
  );

  const [darkMode, setDarkModeState] = useState<boolean>(
    () => localStorage.getItem(DARK_MODE) === 'true'
  );

  const [customPrompts, setCustomPrompts] = useState<Record<AIPromptContext, string>>(loadLocalPrompts);

  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

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

  const loadCustomPrompts = useCallback(async () => {
    try {
      const res = await authFetchRef.current(API);
      if (res.ok) {
        const data = await res.json();
        const prompts = data.prompts as Record<AIPromptContext, string>;
        setCustomPrompts(prompts);
        // Sync to localStorage as fallback
        for (const ctx of Object.keys(PROMPT_KEYS) as AIPromptContext[]) {
          localStorage.setItem(PROMPT_KEYS[ctx], prompts[ctx] ?? '');
        }
      }
    } catch { /* fallback to localStorage values already in state */ }
  }, []);

  const saveCustomPrompt = useCallback((context: AIPromptContext, value: string) => {
    // Optimistic state update
    setCustomPrompts(prev => ({ ...prev, [context]: value }));
    // localStorage fallback
    localStorage.setItem(PROMPT_KEYS[context], value);

    // Debounced API save
    if (saveTimers.current[context]) clearTimeout(saveTimers.current[context]);
    saveTimers.current[context] = setTimeout(async () => {
      delete saveTimers.current[context];
      try {
        await authFetchRef.current(`${API}/${context}`, {
          method: 'PUT',
          body: JSON.stringify({ value }),
        });
      } catch { /* silent */ }
    }, DEBOUNCE_MS);
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(saveTimers.current).forEach(t => clearTimeout(t));
    };
  }, []);

  return { geminiKey, saveGeminiKey, selectedModel, saveSelectedModel, darkMode, toggleDarkMode, customPrompts, saveCustomPrompt, loadCustomPrompts };
}
