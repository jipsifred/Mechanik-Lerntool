import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  MoreHorizontal,
  Settings2,
} from 'lucide-react';
import { ChatIcon, CardsIcon, ErrorIcon, MathIcon } from '../components/icons';
import { LoginScreen } from '../components/auth/LoginScreen';
import { ChatPanel } from '../components/chat';
import { ErrorPanel } from '../components/error';
import { FlashcardPanel } from '../components/flashcard';
import { FormulaPanel } from '../components/formula';
import { SettingsModal } from '../components/settings';
import { TaskPanel, SubtaskList } from '../components/task';
import { GlassButton, GlassContainer } from '../components/ui';
import { InlineAIContext } from '../context/InlineAIContext';
import { AuthProvider } from '../context/AuthContext';
import { AI_MODELS, THEMES } from '../data/mockData';
import { useAuth } from '../hooks/useAuth';
import { useChat } from '../hooks/useChat';
import { useErrors } from '../hooks/useErrors';
import { useFlashcards } from '../hooks/useFlashcards';
import { useFormulas } from '../hooks/useFormulas';
import { useSettings } from '../hooks/useSettings';
import { useTask } from '../hooks/useTask';
import { useTaskList, type TaskListItem } from '../hooks/useTaskList';
import { useUserProgress } from '../hooks/useUserProgress';
import type { Flashcard, Subcategory, Theme, UserError, UserFormula } from '../types';
import './iphone.css';

const STORAGE_KEYS = {
  currentView: 'iphone_current_view',
  dashboardTab: 'iphone_dashboard_tab',
  taskTab: 'iphone_task_tab',
  taskId: 'iphone_task_id',
  cardSide: 'iphone_card_side',
  taskCategory: 'iphone_task_category',
} as const;

const TASK_TABS = [
  { id: 1, label: 'Chat', icon: ChatIcon },
  { id: 2, label: 'Karten', icon: CardsIcon },
  { id: 3, label: 'Fehler', icon: ErrorIcon },
  { id: 4, label: 'Formeln', icon: MathIcon },
] as const;

type IphoneView = 'dashboard' | 'task';
type DashboardTab = 'aufgaben' | 'karten' | 'fehler' | 'formeln';
type CardSide = 'front' | 'back';

function readStoredNumber(key: string, fallback: number) {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;

  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

function readStoredTaskId() {
  const raw = localStorage.getItem(STORAGE_KEYS.taskId);
  if (!raw) return null;

  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function readStoredCategory() {
  return localStorage.getItem(STORAGE_KEYS.taskCategory);
}

function persistValue(key: string, value: string) {
  localStorage.setItem(key, value);
}

function notePreview(note: string | null | undefined) {
  if (!note) return 'Noch kein Inhalt';
  return note
    .replace(/[#>*_`-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 140) || 'Noch kein Inhalt';
}

function getThemeForCategory(category: string | null) {
  if (!category) return null;
  return THEMES.find((theme) => theme.kategorien.some((sub) => sub.code === category)) ?? null;
}

function getCategoryTitle(category: string | null) {
  if (!category) return 'Ohne Kategorie';
  for (const theme of THEMES) {
    const match = theme.kategorien.find((sub) => sub.code === category);
    if (match) return match.titel;
  }
  return category;
}

function SectionTabs({
  active,
  tabs,
  onChange,
}: {
  active: string;
  tabs: Array<{ id: string; label: string }>;
  onChange: (id: string) => void;
}) {
  return (
    <div className="iphone-tab-row flex gap-2 overflow-x-auto pb-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            active === tab.id
              ? 'glass-panel text-slate-800'
              : 'glass-panel-inner text-slate-500'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-panel-inner rounded-full px-3 py-1.5 text-[11px] font-medium text-slate-500">
      <span className="text-slate-400">{label}</span>{' '}
      <span className="text-slate-700">{value}</span>
    </div>
  );
}

function DeckTile({
  title,
  count,
  onClick,
  compact = false,
}: {
  title: string;
  count: number;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`group relative w-full overflow-hidden rounded-[24px] glass-panel-soft text-left ${
        compact ? 'h-[188px]' : 'h-[208px]'
      }`}
    >
      <div className="absolute inset-x-5 top-6 h-[84px] rounded-[22px] border border-white/70 bg-white/35 -rotate-6 transition-transform duration-300 group-hover:-translate-y-1" />
      <div className="absolute inset-x-7 top-8 h-[88px] rounded-[22px] border border-white/80 bg-white/55 rotate-3 transition-transform duration-300 group-hover:translate-y-0.5" />
      <div className="absolute inset-x-6 top-10 h-[94px] rounded-[22px] border border-white bg-white/80 shadow-sm" />

      <div className="absolute inset-x-0 bottom-0 h-[96px] bg-gradient-to-t from-white/80 via-white/65 to-white/10" />
      <div className="absolute inset-x-5 bottom-5">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="text-base font-semibold text-slate-800 leading-snug">{title}</div>
            <div className="mt-1 text-sm text-slate-500">
              {count} {count === 1 ? 'Eintrag' : 'Eintraege'}
            </div>
          </div>
          <ChevronRight size={18} className="shrink-0 text-slate-300 transition-colors group-hover:text-slate-400" />
        </div>
      </div>
    </button>
  );
}

function CardItemTile({
  title,
  subtitle,
  meta,
  onClick,
}: {
  title: string;
  subtitle?: string;
  meta: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-[22px] glass-panel-soft p-4 text-left"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-800">{title}</div>
          {subtitle ? (
            <div className="mt-1 text-xs text-slate-400">{subtitle}</div>
          ) : null}
        </div>
        <ChevronRight size={16} className="shrink-0 text-slate-300" />
      </div>
      <div className="mt-3">
        <StatPill label="Teilaufgaben" value={meta} />
      </div>
    </button>
  );
}

function CardReviewMobile({
  card,
  cards,
  category,
  onBack,
  onNavigate,
  onOpenTask,
}: {
  card: Flashcard;
  cards: Flashcard[];
  category: string | null;
  onBack: () => void;
  onNavigate: (card: Flashcard) => void;
  onOpenTask: (taskId: number, tab?: number, category?: string | null) => void;
}) {
  const { task, subtasks, loading } = useTask(card.task_id ?? null);
  const currentIndex = cards.findIndex((entry) => entry.id === card.id);
  const canPrev = currentIndex > 0;
  const canNext = currentIndex < cards.length - 1;

  const goTo = (nextIndex: number) => {
    const nextCard = cards[nextIndex];
    if (!nextCard) return;
    onNavigate(nextCard);
  };

  return (
    <div className="space-y-3">
      <div className="glass-panel-soft rounded-[22px] p-3">
        <div className="flex items-center gap-2">
          <GlassContainer className="h-10 w-10 justify-center">
            <GlassButton onClick={onBack} title="Zurueck">
              <ArrowLeft size={16} />
            </GlassButton>
          </GlassContainer>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-slate-800">
              {task?.title || card.front || 'Karte'}
            </div>
            <div className="text-xs text-slate-400">
              {currentIndex + 1} / {cards.length}
            </div>
          </div>
          <GlassContainer className="h-10 gap-0.5 px-1">
            <GlassButton onClick={() => canPrev && goTo(currentIndex - 1)} title="Vorherige Karte">
              <ChevronLeft size={16} />
            </GlassButton>
            <GlassButton onClick={() => canNext && goTo(currentIndex + 1)} title="Naechste Karte">
              <ChevronRight size={16} />
            </GlassButton>
          </GlassContainer>
        </div>

        {card.task_id ? (
          <button
            onClick={() => onOpenTask(card.task_id!, 2, category)}
            className="mt-3 rounded-full glass-panel-inner px-4 py-2 text-sm font-medium text-slate-700"
          >
            Zur Aufgabe
          </button>
        ) : null}
      </div>

      <section className="glass-panel-soft panel-radius p-4">
        {loading || !task ? (
          <div className="text-sm text-slate-500">Lade Karte...</div>
        ) : (
          <TaskPanel
            title={task.title}
            description={task.description}
            givenLatex={task.given_latex}
            imageUrl={task.image_url}
          />
        )}
      </section>

      <section className="glass-panel-soft panel-radius p-4 min-h-[320px]">
        <FlashcardPanel
          taskId={card.task_id ?? 0}
          taskTitle={task?.title ?? card.front ?? ''}
          taskDescription={task?.description ?? ''}
          taskGivenLatex={task?.given_latex ?? ''}
          taskImageUrl={task?.image_url ?? null}
          subtasks={subtasks}
          mode="review"
          cardSide="back"
          sections={(() => {
            try {
              const parsed = JSON.parse(card.back);
              return Array.isArray(parsed) ? parsed : [];
            } catch {
              return [];
            }
          })()}
          saving={false}
          saved={false}
          onLoadOrInit={() => {}}
          onUpdateSection={() => {}}
        />
      </section>
    </div>
  );
}

function TaskPickerSheet({
  tasks,
  currentTaskId,
  title,
  subtitle,
  onSelect,
  onClose,
}: {
  tasks: TaskListItem[];
  currentTaskId: number | null;
  title: string;
  subtitle?: string;
  onSelect: (taskId: number) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-end">
      <button className="absolute inset-0 bg-black/25" onClick={onClose} aria-label="Aufgabenliste schließen" />
      <div className="iphone-safe-bottom relative z-10 w-full glass-panel-soft rounded-t-[28px] px-4 pb-4 pt-4 max-h-[78dvh] flex flex-col">
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-300/70" />
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-slate-800">{title}</h2>
            {subtitle ? (
              <p className="truncate text-sm text-slate-400">{subtitle}</p>
            ) : null}
          </div>
          <GlassContainer className="h-10 w-10 justify-center">
            <GlassButton onClick={onClose} title="Schließen">
              <ArrowLeft size={16} />
            </GlassButton>
          </GlassContainer>
        </div>
        <div className="iphone-scroll flex-1 overflow-y-auto space-y-2 pr-1">
          {tasks.map((task) => {
            const isActive = task.id === currentTaskId;
            return (
              <button
                key={task.id}
                onClick={() => onSelect(task.id)}
                className={`w-full rounded-2xl border px-4 py-3 text-left transition-colors ${
                  isActive
                    ? 'glass-panel border-transparent text-slate-800'
                    : 'bg-white/45 border-white/70 text-slate-600'
                }`}
              >
                <div className="text-xs uppercase tracking-[0.12em] text-slate-400">
                  {task.category}
                </div>
                <div className="mt-1 text-sm font-medium">{task.title}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ThemeOverview({
  tasks,
  getTaskCheckState,
  onOpenTheme,
}: {
  tasks: TaskListItem[];
  getTaskCheckState: (taskId: number) => 'none' | 'green' | 'yellow';
  onOpenTheme: (theme: Theme) => void;
}) {
  return (
    <div className="space-y-3">
      {THEMES.map((theme) => {
        const themeTasks = theme.kategorien.flatMap((sub) =>
          tasks.filter((task) => task.category === sub.code)
        );
        if (themeTasks.length === 0) return null;

        const done = themeTasks.filter((task) => getTaskCheckState(task.id) !== 'none').length;

        return (
          <button
            key={theme.id}
            onClick={() => onOpenTheme(theme)}
            className="w-full rounded-[24px] glass-panel-soft p-4 text-left"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-base font-semibold text-slate-800">{theme.titel}</div>
                <div className="mt-1 text-sm text-slate-500">
                  {themeTasks.length} {themeTasks.length === 1 ? 'Aufgabe' : 'Aufgaben'}
                </div>
              </div>
              <StatPill label="Fortschritt" value={`${done}/${themeTasks.length}`} />
            </div>
          </button>
        );
      })}
    </div>
  );
}

function ThemeDetail({
  theme,
  tasks,
  collapsedCategories,
  getTaskCheckState,
  onBack,
  onToggleCategory,
  onCycleCheck,
  onOpenTask,
}: {
  theme: Theme;
  tasks: TaskListItem[];
  collapsedCategories: Set<string>;
  getTaskCheckState: (taskId: number) => 'none' | 'green' | 'yellow';
  onBack: () => void;
  onToggleCategory: (code: string) => void;
  onCycleCheck: (taskId: number) => void;
  onOpenTask: (taskId: number, tabId?: number, category?: string | null) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="glass-panel-soft rounded-[22px] p-3">
        <div className="flex items-center gap-3">
          <GlassContainer className="h-10 w-10 justify-center">
            <GlassButton onClick={onBack} title="Zurueck">
              <ArrowLeft size={16} />
            </GlassButton>
          </GlassContainer>
          <div className="min-w-0">
            <div className="truncate text-lg font-semibold text-slate-800">{theme.titel}</div>
            <div className="text-sm text-slate-400">Kapitelansicht</div>
          </div>
        </div>
      </div>

      {theme.kategorien.map((sub) => {
        const categoryTasks = tasks.filter((task) => task.category === sub.code);
        if (categoryTasks.length === 0) return null;

        const done = categoryTasks.filter((task) => getTaskCheckState(task.id) !== 'none').length;
        const isCollapsed = collapsedCategories.has(sub.code);

        return (
          <section key={sub.code} className="glass-panel-soft rounded-[24px] p-4">
            <button
              onClick={() => onToggleCategory(sub.code)}
              className="flex w-full items-center gap-3 text-left"
            >
              <ChevronDown
                size={16}
                className={`shrink-0 text-slate-400 transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-base font-semibold text-slate-800">{sub.titel}</div>
                <div className="text-xs text-slate-400">
                  {done}/{categoryTasks.length} markiert
                </div>
              </div>
              <StatPill label="Kapitel" value={sub.code} />
            </button>

            {!isCollapsed ? (
              <div className="mt-3 space-y-2">
                {categoryTasks.map((task) => {
                  const state = getTaskCheckState(task.id);

                  return (
                    <div
                      key={task.id}
                      className="flex items-center gap-2 rounded-xl border border-white/70 bg-white/60 px-3 py-2"
                    >
                      <button
                        onClick={() => onOpenTask(task.id, undefined, sub.code)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="truncate text-sm font-medium text-slate-800">{task.title}</div>
                      </button>
                      <button
                        onClick={() => onCycleCheck(task.id)}
                        className={`h-7 w-7 shrink-0 rounded-full flex items-center justify-center transition-all ${
                          state === 'green'
                            ? 'neo-btn-green'
                            : state === 'yellow'
                              ? 'neo-btn-yellow'
                              : 'neo-btn-gray-light'
                        }`}
                        title="Status wechseln"
                      >
                        <Check size={13} strokeWidth={2.5} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

function DashboardNoteSection<T extends UserError | UserFormula>({
  entries,
  tasksById,
  emptyLabel,
  tabId,
  onOpenTask,
}: {
  entries: T[];
  tasksById: Map<number, TaskListItem>;
  emptyLabel: string;
  tabId: number;
  onOpenTask: (taskId: number, tab: number) => void;
}) {
  const grouped = Array.from(
    entries.reduce((map, entry) => {
      if (!entry.task_id) return map;
      const bucket = map.get(entry.task_id) ?? [];
      bucket.push(entry);
      map.set(entry.task_id, bucket);
      return map;
    }, new Map<number, T[]>())
  );

  if (grouped.length === 0) {
    return (
      <div className="glass-panel-soft panel-radius p-5 text-sm text-slate-500">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {grouped.map(([taskId, notes]) => {
        const task = tasksById.get(taskId);

        return (
          <button
            key={taskId}
            onClick={() => onOpenTask(taskId, tabId)}
            className="w-full glass-panel-soft panel-radius p-4 text-left"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-800">
                  {task?.title ?? `Aufgabe ${taskId}`}
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  {getCategoryTitle(task?.category ?? null)}
                </div>
              </div>
              <StatPill label="Einträge" value={String(notes.length)} />
            </div>
            <p className="mt-3 text-sm text-slate-500 line-clamp-3">
              {notePreview(notes[0]?.note)}
            </p>
          </button>
        );
      })}
    </div>
  );
}

function IphoneAppContent() {
  const { user, isLoading, logout } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      document.documentElement.dataset.theme = '';
    }
  }, [isLoading, user]);

  if (isLoading) {
    return (
      <div className="iphone-shell flex min-h-screen items-center justify-center bg-[var(--surface-bg)] px-4 font-sans text-slate-800">
        <div className="glass-panel-soft panel-radius px-6 py-5 text-sm text-slate-500">
          Laden...
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return <IphoneMainApp onLogout={logout} username={user.username} />;
}

function IphoneMainApp({ onLogout, username }: { onLogout: () => void; username: string }) {
  const [currentView, setCurrentView] = useState<IphoneView>(
    () => (localStorage.getItem(STORAGE_KEYS.currentView) as IphoneView) || 'dashboard'
  );
  const [dashboardTab, setDashboardTab] = useState<DashboardTab>(
    () => (localStorage.getItem(STORAGE_KEYS.dashboardTab) as DashboardTab) || 'aufgaben'
  );
  const [activeTab, setActiveTab] = useState(() => readStoredNumber(STORAGE_KEYS.taskTab, 1));
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(readStoredTaskId);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(readStoredCategory);
  const [cardSide, setCardSide] = useState<CardSide>(
    () => (localStorage.getItem(STORAGE_KEYS.cardSide) as CardSide) || 'back'
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [taskPickerOpen, setTaskPickerOpen] = useState(false);
  const [selectedTaskTheme, setSelectedTaskTheme] = useState<Theme | null>(null);
  const [collapsedTaskCategories, setCollapsedTaskCategories] = useState<Set<string>>(new Set());
  const [selectedCardTheme, setSelectedCardTheme] = useState<Theme | null>(null);
  const [selectedCardSubcategory, setSelectedCardSubcategory] = useState<Subcategory | null>(null);
  const [reviewCard, setReviewCard] = useState<Flashcard | null>(null);
  const [reviewCardList, setReviewCardList] = useState<Flashcard[]>([]);

  const {
    geminiKey,
    saveGeminiKey,
    selectedModel,
    saveSelectedModel,
    darkMode,
    toggleDarkMode,
    customPrompts,
    saveCustomPrompt,
    loadCustomPrompts,
  } = useSettings();

  const { tasks, loading: tasksLoading } = useTaskList();
  const {
    loadProgress,
    markSubtaskSolved,
    isSubtaskSolved,
    markTaskInProgress,
    setTaskCheckState,
    getTaskCheckState,
  } = useUserProgress();

  const flashcards = useFlashcards();
  const errors = useErrors();
  const formulas = useFormulas();
  const loadAllCards = flashcards.loadAllCards;
  const parseSections = flashcards.parseSections;
  const loadOrInitCard = flashcards.loadOrInitCard;
  const updateSection = flashcards.updateSection;
  const loadAllErrors = errors.loadAllErrors;
  const loadTaskErrors = errors.loadTaskErrors;
  const addError = errors.addError;
  const updateError = errors.updateError;
  const deleteError = errors.deleteError;
  const flushErrorSaves = errors.flushSaves;
  const loadAllFormulas = formulas.loadAllFormulas;
  const loadTaskFormulas = formulas.loadTaskFormulas;
  const addFormula = formulas.addFormula;
  const updateFormula = formulas.updateFormula;
  const deleteFormula = formulas.deleteFormula;
  const flushFormulaSaves = formulas.flushSaves;

  useEffect(() => { loadProgress(); }, [loadProgress]);
  useEffect(() => { loadCustomPrompts(); }, [loadCustomPrompts]);

  const tasksById = useMemo(
    () => new Map(tasks.map((task) => [task.id, task])),
    [tasks]
  );

  const filteredTasks = useMemo(() => {
    if (!categoryFilter) return tasks;
    const chapterTasks = tasks.filter((task) => task.category === categoryFilter);
    return chapterTasks.length > 0 ? chapterTasks : tasks;
  }, [tasks, categoryFilter]);

  useEffect(() => {
    if (tasks.length === 0) return;
    if (selectedTaskId && tasksById.has(selectedTaskId)) return;

    const nextTaskId = tasks[0].id;
    setSelectedTaskId(nextTaskId);
    persistValue(STORAGE_KEYS.taskId, String(nextTaskId));
  }, [tasks, tasksById, selectedTaskId]);

  useEffect(() => {
    if (filteredTasks.length === 0) return;
    if (selectedTaskId && filteredTasks.some((task) => task.id === selectedTaskId)) return;

    const nextTaskId = filteredTasks[0].id;
    setSelectedTaskId(nextTaskId);
    persistValue(STORAGE_KEYS.taskId, String(nextTaskId));
  }, [filteredTasks, selectedTaskId]);

  const currentTaskIndex = useMemo(
    () => filteredTasks.findIndex((task) => task.id === selectedTaskId),
    [filteredTasks, selectedTaskId]
  );

  const currentTaskId = currentTaskIndex >= 0 ? filteredTasks[currentTaskIndex]?.id ?? null : null;
  const { task, subtasks, apiSubtasks, loading: taskLoading } = useTask(currentTaskId);

  useEffect(() => {
    if (currentView === 'task' && task) {
      markTaskInProgress(task.id);
    }
  }, [currentView, task, markTaskInProgress]);

  const refreshDashboardData = useCallback(() => {
    loadAllCards();
    loadAllErrors();
    loadAllFormulas();
  }, [loadAllCards, loadAllErrors, loadAllFormulas]);

  useEffect(() => {
    if (currentView === 'dashboard') {
      refreshDashboardData();
    }
  }, [currentView, dashboardTab, refreshDashboardData]);

  useEffect(() => {
    if (dashboardTab === 'karten') return;
    setSelectedCardTheme(null);
    setSelectedCardSubcategory(null);
    setReviewCard(null);
    setReviewCardList([]);
  }, [dashboardTab]);

  const toggleTaskCategory = useCallback((code: string) => {
    setCollapsedTaskCategories((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }, []);

  const cardStats = useCallback((card: Flashcard) => {
    const sections = parseSections(card.back);
    const filled = sections.filter((section) => section.content.trim().length > 0).length;
    return { sections, filled };
  }, [parseSections]);

  const cardsByCategory = useCallback((code: string) => (
    tasks
      .filter((taskEntry) => taskEntry.category === code)
      .map((taskEntry) => flashcards.allCards.find((card) => card.task_id === taskEntry.id))
      .filter((card): card is Flashcard => Boolean(card))
      .filter((card) => cardStats(card).filled > 0)
  ), [cardStats, flashcards.allCards, tasks]);

  const cardsByTheme = useCallback((themeId: string) => (
    (THEMES.find((theme) => theme.id === themeId)?.kategorien ?? []).flatMap((subcategory) =>
      cardsByCategory(subcategory.code)
    )
  ), [cardsByCategory]);

  const availableCards = useMemo(() => (
    flashcards.allCards.filter((card) => card.task_id && cardStats(card).filled > 0)
  ), [cardStats, flashcards.allCards]);

  const openCardTheme = useCallback((theme: Theme) => {
    setSelectedCardTheme(theme);
    setSelectedCardSubcategory(null);
    setReviewCard(null);
    setReviewCardList([]);
  }, []);

  const openCardSubcategory = useCallback((subcategory: Subcategory) => {
    setSelectedCardSubcategory(subcategory);
    setReviewCard(null);
    setReviewCardList([]);
  }, []);

  const openReviewCard = useCallback((card: Flashcard, cards: Flashcard[]) => {
    setReviewCard(card);
    setReviewCardList(cards);
  }, []);

  const persistCurrentView = useCallback((view: IphoneView) => {
    setCurrentView(view);
    persistValue(STORAGE_KEYS.currentView, view);
  }, []);

  const persistDashboardTab = useCallback((tab: DashboardTab) => {
    setDashboardTab(tab);
    persistValue(STORAGE_KEYS.dashboardTab, tab);
  }, []);

  const persistTaskTab = useCallback((tabId: number) => {
    setActiveTab(tabId);
    persistValue(STORAGE_KEYS.taskTab, String(tabId));
  }, []);

  const persistCategoryFilter = useCallback((category: string | null) => {
    setCategoryFilter(category);
    if (category) {
      persistValue(STORAGE_KEYS.taskCategory, category);
    } else {
      localStorage.removeItem(STORAGE_KEYS.taskCategory);
    }
  }, []);

  const persistCardSide = useCallback((side: CardSide) => {
    setCardSide(side);
    persistValue(STORAGE_KEYS.cardSide, side);
  }, []);

  const selectTask = useCallback((taskId: number) => {
    setSelectedTaskId(taskId);
    persistValue(STORAGE_KEYS.taskId, String(taskId));
  }, []);

  const navigateTo = useCallback(async (view: IphoneView) => {
    if (view === 'dashboard') {
      await flushErrorSaves();
      await flushFormulaSaves();
      refreshDashboardData();
    }

    persistCurrentView(view);
  }, [flushErrorSaves, flushFormulaSaves, refreshDashboardData, persistCurrentView]);

  const openTask = useCallback((taskId: number, tabId?: number, category?: string | null) => {
    selectTask(taskId);
    persistCategoryFilter(category ?? tasksById.get(taskId)?.category ?? null);
    if (tabId) persistTaskTab(tabId);
    persistCurrentView('task');
    setTaskPickerOpen(false);
  }, [persistCategoryFilter, persistCurrentView, persistTaskTab, selectTask, tasksById]);

  const goPrev = useCallback(() => {
    if (currentTaskIndex <= 0) return;
    openTask(filteredTasks[currentTaskIndex - 1].id);
  }, [currentTaskIndex, filteredTasks, openTask]);

  const goNext = useCallback(() => {
    if (currentTaskIndex < 0 || currentTaskIndex >= filteredTasks.length - 1) return;
    openTask(filteredTasks[currentTaskIndex + 1].id);
  }, [currentTaskIndex, filteredTasks, openTask]);

  const handleCheckCycleForTask = useCallback((taskId: number) => {
    const current = getTaskCheckState(taskId);
    const next = current === 'none' ? 'green' : current === 'green' ? 'yellow' : 'none';
    setTaskCheckState(taskId, next);
  }, [getTaskCheckState, setTaskCheckState]);

  const handleChecked = useCallback((state: 'green' | 'yellow') => {
    if (!task) return;
    setTaskCheckState(task.id, state);
  }, [task, setTaskCheckState]);

  const handleCopy = useCallback(async () => {
    if (!task) return;

    let markdown = `## ${task.title}\n\n${task.description}\n\n`;
    if (task.given_latex) markdown += `**Gegeben:** ${task.given_latex}\n\n`;
    for (const subtask of apiSubtasks) {
      markdown += `**${subtask.label}** ${subtask.description}\n\n`;
      markdown += `$$${subtask.raw_formula}$$\n\n`;
      if (subtask.solution) markdown += `**Lösung:** $${subtask.solution}$\n\n`;
    }
    const text = markdown.trim();

    try {
      const textBlob = new Blob([text], { type: 'text/plain' });
      const items: Record<string, Blob | Promise<Blob>> = { 'text/plain': textBlob };

      if (task.image_url) {
        items['image/png'] = fetch(task.image_url, { referrerPolicy: 'no-referrer' })
          .then((response) => response.blob())
          .then((blob) => {
            if (blob.type === 'image/png') return blob;
            return textBlob;
          })
          .catch(() => textBlob);
      }

      await navigator.clipboard.write([new ClipboardItem(items)]);
    } catch {
      await navigator.clipboard.writeText(text).catch(() => {});
    }
  }, [task, apiSubtasks]);

  const { messages, isTyping, inputValue, setInputValue, sendMessage, handleKeyDown } = useChat(
    geminiKey,
    task,
    apiSubtasks,
    selectedModel,
    customPrompts.chat
  );

  const currentTaskMeta = currentTaskId ? tasksById.get(currentTaskId) : null;
  const currentTheme = getThemeForCategory(currentTaskMeta?.category ?? null);
  const currentCategoryTitle = getCategoryTitle(categoryFilter ?? currentTaskMeta?.category ?? null);

  return (
    <div className="iphone-shell flex min-h-screen flex-col bg-[var(--surface-bg)] px-3 font-sans text-slate-800">
      {currentView === 'dashboard' ? (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <header className="flex items-center justify-between gap-3 px-1 pt-1">
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Mechanik Lerntool</div>
              <h1 className="truncate text-xl font-semibold text-slate-800">Mobile Ansicht</h1>
            </div>
            <GlassContainer className="h-10 w-10 justify-center">
              <GlassButton onClick={() => setSettingsOpen(true)} title="Einstellungen">
                <Settings2 size={16} />
              </GlassButton>
            </GlassContainer>
          </header>

          <SectionTabs
            active={dashboardTab}
            tabs={[
              { id: 'aufgaben', label: 'Aufgaben' },
              { id: 'karten', label: 'Karten' },
              { id: 'fehler', label: 'Fehler' },
              { id: 'formeln', label: 'Formeln' },
            ]}
            onChange={(tab) => persistDashboardTab(tab as DashboardTab)}
          />

          <div className="iphone-scroll flex-1 overflow-y-auto pb-6">
            {dashboardTab === 'aufgaben' && (
              selectedTaskTheme ? (
                <ThemeDetail
                  theme={selectedTaskTheme}
                  tasks={tasks}
                  collapsedCategories={collapsedTaskCategories}
                  getTaskCheckState={getTaskCheckState}
                  onBack={() => setSelectedTaskTheme(null)}
                  onToggleCategory={toggleTaskCategory}
                  onCycleCheck={handleCheckCycleForTask}
                  onOpenTask={openTask}
                />
              ) : (
                <ThemeOverview
                  tasks={tasks}
                  getTaskCheckState={getTaskCheckState}
                  onOpenTheme={setSelectedTaskTheme}
                />
              )
            )}

            {dashboardTab === 'karten' && (
              reviewCard ? (
                <CardReviewMobile
                  card={reviewCard}
                  cards={reviewCardList}
                  category={reviewCard.task_id ? tasksById.get(reviewCard.task_id)?.category ?? null : null}
                  onBack={() => setReviewCard(null)}
                  onNavigate={setReviewCard}
                  onOpenTask={openTask}
                />
              ) : selectedCardTheme && selectedCardSubcategory ? (
                (() => {
                  const cards = cardsByCategory(selectedCardSubcategory.code);

                  return (
                    <div className="space-y-3">
                      <div className="glass-panel-soft rounded-[22px] p-3">
                        <div className="flex items-center gap-3">
                          <GlassContainer className="h-10 w-10 justify-center">
                            <GlassButton onClick={() => setSelectedCardSubcategory(null)} title="Zurueck">
                              <ArrowLeft size={16} />
                            </GlassButton>
                          </GlassContainer>
                          <div className="min-w-0">
                            <div className="truncate text-lg font-semibold text-slate-800">{selectedCardSubcategory.titel}</div>
                            <div className="truncate text-sm text-slate-400">{selectedCardTheme.titel}</div>
                          </div>
                        </div>
                      </div>

                      {cards.length === 0 ? (
                        <div className="glass-panel-soft panel-radius p-5 text-sm text-slate-500">
                          Noch keine Karten in diesem Stapel.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {cards.map((card) => {
                            const taskMeta = card.task_id ? tasksById.get(card.task_id) : undefined;
                            const { sections, filled } = cardStats(card);

                            return (
                              <CardItemTile
                                key={card.id}
                                title={card.front || taskMeta?.title || `Aufgabe ${card.task_id}`}
                                subtitle={taskMeta?.title && taskMeta.title !== card.front ? taskMeta.title : undefined}
                                meta={`${filled}/${sections.length}`}
                                onClick={() => openReviewCard(card, cards)}
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : selectedCardTheme ? (
                <div className="space-y-3">
                  <div className="glass-panel-soft rounded-[22px] p-3">
                    <div className="flex items-center gap-3">
                      <GlassContainer className="h-10 w-10 justify-center">
                        <GlassButton onClick={() => setSelectedCardTheme(null)} title="Zurueck">
                          <ArrowLeft size={16} />
                        </GlassButton>
                      </GlassContainer>
                      <div className="truncate text-lg font-semibold text-slate-800">{selectedCardTheme.titel}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {selectedCardTheme.kategorien.map((subcategory) => (
                      <DeckTile
                        key={subcategory.code}
                        title={subcategory.titel}
                        count={cardsByCategory(subcategory.code).length}
                        compact
                        onClick={() => openCardSubcategory(subcategory)}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                availableCards.length === 0 ? (
                  <div className="glass-panel-soft panel-radius p-5 text-sm text-slate-500">
                    Noch keine Karteikarten.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {THEMES.map((theme) => {
                      const cards = cardsByTheme(theme.id);
                      if (cards.length === 0) return null;

                      return (
                        <DeckTile
                          key={theme.id}
                          title={theme.titel}
                          count={cards.length}
                          onClick={() => openCardTheme(theme)}
                        />
                      );
                    })}
                  </div>
                )
              )
            )}

            {dashboardTab === 'fehler' && (
              <DashboardNoteSection
                entries={errors.allErrors}
                tasksById={tasksById}
                emptyLabel="Noch keine Fehler."
                tabId={3}
                onOpenTask={openTask}
              />
            )}

            {dashboardTab === 'formeln' && (
              <DashboardNoteSection
                entries={formulas.allFormulas}
                tasksById={tasksById}
                emptyLabel="Noch keine Formeln."
                tabId={4}
                onOpenTask={openTask}
              />
            )}

            {tasksLoading && (
              <div className="glass-panel-soft panel-radius mt-3 p-5 text-sm text-slate-500">
                Laden...
              </div>
            )}
          </div>
        </div>
      ) : (
        <InlineAIContext.Provider
          value={{
            geminiKey,
            selectedModel,
            task,
            apiSubtasks,
            customPrompts: {
              karteikarten: customPrompts.karteikarten,
              fehler: customPrompts.fehler,
              formeln: customPrompts.formeln,
            },
          }}
        >
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            <header className="shrink-0 rounded-[20px] glass-panel-soft p-3">
              <div className="flex items-start justify-between gap-3">
                <GlassContainer className="h-10 w-10 justify-center">
                  <GlassButton onClick={() => navigateTo('dashboard')} title="Zur Übersicht">
                    <ArrowLeft size={16} />
                  </GlassButton>
                </GlassContainer>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs uppercase tracking-[0.14em] text-slate-400">
                    {currentTheme?.titel ?? 'Aufgabe'}
                  </div>
                  <div className="truncate text-base font-semibold text-slate-800">
                    {currentTaskMeta?.title ?? 'Lade Aufgabe...'}
                  </div>
                </div>
                <GlassContainer className="h-10 w-10 justify-center">
                  <GlassButton onClick={() => setSettingsOpen(true)} title="Einstellungen">
                    <Settings2 size={16} />
                  </GlassButton>
                </GlassContainer>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <GlassContainer className="h-10 gap-0.5 px-1">
                  <GlassButton onClick={goPrev} title="Vorherige Aufgabe">
                    <ChevronLeft size={16} />
                  </GlassButton>
                  <span className="min-w-[4.5rem] px-1 text-center text-sm font-medium text-slate-600">
                    {currentTaskIndex >= 0 ? currentTaskIndex + 1 : '-'} / {filteredTasks.length}
                  </span>
                  <GlassButton onClick={goNext} title="Nächste Aufgabe">
                    <ChevronRight size={16} />
                  </GlassButton>
                </GlassContainer>

                <GlassContainer className="h-10 gap-0.5">
                  <GlassButton onClick={() => setTaskPickerOpen(true)} title="Aufgabenliste">
                    <MoreHorizontal size={16} />
                  </GlassButton>
                  <GlassButton onClick={handleCopy} title="Markdown kopieren">
                    <Copy size={16} />
                  </GlassButton>
                  <button
                    onClick={() => currentTaskId && handleCheckCycleForTask(currentTaskId)}
                    className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center transition-all ${
                      currentTaskId && getTaskCheckState(currentTaskId) === 'green'
                        ? 'neo-btn-green'
                        : currentTaskId && getTaskCheckState(currentTaskId) === 'yellow'
                          ? 'neo-btn-yellow'
                          : 'neo-btn-gray-light'
                    }`}
                    title="Status wechseln"
                  >
                    <Check size={15} strokeWidth={2.5} />
                  </button>
                </GlassContainer>
              </div>
            </header>

            <div className="iphone-scroll flex-1 overflow-y-auto pb-6">
              {taskLoading || !task ? (
                <div className="glass-panel-soft panel-radius p-5 text-sm text-slate-500">
                  Lade Aufgabe...
                </div>
              ) : (
                <div className="space-y-3">
                  <section className="glass-panel-soft panel-radius p-4">
                    <TaskPanel
                      title={task.title}
                      description={task.description}
                      givenLatex={task.given_latex}
                      imageUrl={task.image_url}
                    />
                  </section>

                  <section className="glass-panel-soft panel-radius p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h2 className="text-sm font-semibold text-slate-800">Teilaufgaben</h2>
                      {currentTaskMeta?.category && (
                        <StatPill label="Kategorie" value={currentTaskMeta.category} />
                      )}
                    </div>
                    <div className="min-h-[120px]">
                      <SubtaskList
                        subtasks={subtasks}
                        apiSubtasks={apiSubtasks}
                        onSubtaskSolved={markSubtaskSolved}
                        isSubtaskSolved={isSubtaskSolved}
                        onChecked={handleChecked}
                      />
                    </div>
                  </section>

                  <section className="glass-panel-soft panel-radius p-4">
                    <div className="space-y-3">
                      <div className="iphone-tab-row flex gap-2 overflow-x-auto pb-1">
                        {TASK_TABS.map((tab) => {
                          const Icon = tab.icon;
                          const isActive = activeTab === tab.id;
                          return (
                            <button
                              key={tab.id}
                              onClick={() => persistTaskTab(tab.id)}
                              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                                isActive ? 'glass-panel text-slate-800' : 'glass-panel-inner text-slate-500'
                              }`}
                            >
                              <span className="flex items-center gap-2">
                                <Icon className="h-4 w-4" />
                                {tab.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {activeTab === 1 && (
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
                            Modell
                          </label>
                          <div className="relative">
                            <select
                              value={selectedModel}
                              onChange={(event) => saveSelectedModel(event.target.value)}
                              className="appearance-none rounded-full glass-panel-inner px-4 py-2 pr-8 text-sm text-slate-700 outline-none"
                            >
                              {AI_MODELS.map((model) => (
                                <option key={model.id} value={model.id}>{model.label}</option>
                              ))}
                            </select>
                            <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          </div>
                        </div>
                      )}

                      {activeTab === 2 && (
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
                            Kartenansicht
                          </label>
                          <button
                            onClick={() => persistCardSide(cardSide === 'front' ? 'back' : 'front')}
                            className="rounded-full glass-panel-inner px-4 py-2 text-sm font-medium text-slate-700"
                          >
                            {cardSide === 'front' ? 'Vorderseite' : 'Rückseite'}
                          </button>
                        </div>
                      )}

                      <div className="min-h-[420px] flex flex-col">
                        {activeTab === 1 ? (
                          <div className="relative flex min-h-[420px] flex-1 flex-col">
                            <ChatPanel
                              messages={messages}
                              isTyping={isTyping}
                              inputValue={inputValue}
                              onInputChange={setInputValue}
                              onSend={sendMessage}
                              onKeyDown={handleKeyDown}
                            />
                          </div>
                        ) : activeTab === 2 ? (
                          <FlashcardPanel
                            taskId={task.id}
                            taskTitle={task.title}
                            taskDescription={task.description}
                            taskGivenLatex={task.given_latex}
                            taskImageUrl={task.image_url}
                            subtasks={subtasks}
                            mode="edit"
                            cardSide={cardSide}
                            sections={flashcards.sections}
                            saving={flashcards.saving}
                            saved={flashcards.saved}
                            onLoadOrInit={loadOrInitCard}
                            onUpdateSection={updateSection}
                          />
                        ) : activeTab === 3 ? (
                          <ErrorPanel
                            taskId={task.id}
                            errors={errors.taskErrors}
                            saving={errors.saving}
                            saved={errors.saved}
                            onLoad={loadTaskErrors}
                            onAdd={addError}
                            onUpdate={updateError}
                            onDelete={deleteError}
                          />
                        ) : (
                          <FormulaPanel
                            taskId={task.id}
                            formulas={formulas.taskFormulas}
                            saving={formulas.saving}
                            saved={formulas.saved}
                            onLoad={loadTaskFormulas}
                            onAdd={addFormula}
                            onUpdate={updateFormula}
                            onDelete={deleteFormula}
                          />
                        )}
                      </div>
                    </div>
                  </section>
                </div>
              )}
            </div>
          </div>
        </InlineAIContext.Provider>
      )}

      {taskPickerOpen && (
        <TaskPickerSheet
          tasks={filteredTasks}
          currentTaskId={currentTaskId}
          title={currentCategoryTitle}
          subtitle={currentTheme?.titel}
          onSelect={(taskId) => openTask(taskId)}
          onClose={() => setTaskPickerOpen(false)}
        />
      )}

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        geminiKey={geminiKey}
        onSaveGemini={saveGeminiKey}
        username={username}
        onLogout={onLogout}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
        customPrompts={customPrompts}
        onSaveCustomPrompt={saveCustomPrompt}
      />
    </div>
  );
}

export default function IphoneApp() {
  return (
    <AuthProvider>
      <IphoneAppContent />
    </AuthProvider>
  );
}
