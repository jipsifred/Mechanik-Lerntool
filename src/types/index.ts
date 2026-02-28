import type { ReactNode, ComponentType, SVGProps, KeyboardEvent } from 'react';

/* ─── Chat ─── */
export interface Message {
  id: number;
  sender: 'user' | 'system';
  text: string;
}

/* ─── Task / Subtasks ─── */
export interface Subtask {
  id: string;
  description: ReactNode;
  mathPrefix: string;
  mathSuffix: string;
  solution: string;
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
}

export interface HeaderProps {
  activePillOption: string;
  onPillChange: (option: string) => void;
}

export interface TaskPanelProps {
  /* extensible for dynamic task data later */
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
