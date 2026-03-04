import { createContext, useContext } from 'react';
import type { ApiTask, ApiSubtask } from '../types';

export interface InlineAIContextValue {
  geminiKey: string;
  selectedModel: string;
  task: ApiTask | null;
  apiSubtasks: ApiSubtask[];
}

export const InlineAIContext = createContext<InlineAIContextValue | null>(null);

export function useInlineAIContext() {
  return useContext(InlineAIContext);
}
