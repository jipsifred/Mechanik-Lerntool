import type { ReactNode, ComponentType, SVGProps, KeyboardEvent } from 'react';

/* ─── Chat ─── */
export interface Message {
  id: number;
  sender: 'user' | 'system';
  text: string;
}

/* ─── Task / Subtasks ─── */
export interface FormulaField {
  mathPrefix: string;
  solution: string;
  mathSuffix: string;
}

export interface Subtask {
  id: string;
  description: string;
  fields: FormulaField[];
}

/* ─── API Response Types ─── */
export interface ApiTask {
  id: number;
  page_start: number;
  title: string;
  total_points: number;
  description: string;
  given_latex: string;
  image_url: string | null;
  image_bbox: string | null;
}

export interface ApiSubtask {
  id: number;
  task_id: number;
  ff_index: number;
  label: string;
  description: string;
  math_prefix: string;
  math_suffix: string;
  solution: string;
  points: number;
  raw_formula: string;
  formula_group: number;
}

export interface TaskResponse {
  task: ApiTask;
  subtasks: ApiSubtask[];
  total: number;
}

export interface TaskListResponse {
  tasks: Array<{ id: number; title: string; total_points: number }>;
  total: number;
}

/* ─── Tabs ─── */
export interface TabConfig {
  id: number;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;
}

/* ─── Component Props ─── */
export interface GlassContainerProps {
  children: ReactNode;
  className?: string;
}

export interface GlassButtonProps {
  onClick?: () => void;
  children: ReactNode;
  isActive?: boolean;
  title?: string;
  className?: string;
}

export interface SolutionBoxProps {
  solution: string;
  isSolved: boolean;
}

export interface MessageBubbleProps {
  message: Message;
}

export interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onKeyDown: (e: KeyboardEvent) => void;
}

export interface ChatPanelProps {
  messages: Message[];
  isTyping: boolean;
  inputValue: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onKeyDown: (e: KeyboardEvent) => void;
  selectedModelId: string;
  onModelChange: (modelId: string) => void;
}

export interface HeaderProps {
  activePillOption: string;
  onPillChange: (option: string) => void;
  currentTask: number;
  totalTasks: number;
  onPrev: () => void;
  onNext: () => void;
  onDashboard: () => void;
}

/* ─── AI Providers & Models ─── */
export type AiProvider = 'gemini' | 'groq';

export interface AiModel {
  id: string;
  label: string;
  provider: AiProvider;
}

/* ─── Dashboard ─── */
export type DashboardTabId = 'aufgaben' | 'formeln' | 'fehler' | 'karten';

export interface Chapter {
  id: number;
  title: string;
  taskCount: number;
  completedCount: number;
}

export interface DashboardViewProps {
  onNavigateToTask: () => void;
  onOpenSettings: () => void;
}

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  geminiKey: string;
  groqKey: string;
  onSaveGemini: (key: string) => void;
  onSaveGroq: (key: string) => void;
}

export interface TaskPanelProps {
  title: string;
  description: string;
  givenLatex: string;
  imageUrl: string | null;
}

export interface SubtaskListProps {
  subtasks: Subtask[];
  isSolved: boolean;
}

export interface TabBarProps {
  activeTab: number;
  onTabChange: (id: number) => void;
  tabs: TabConfig[];
}
