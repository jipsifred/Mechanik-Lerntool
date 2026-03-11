import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  LogOut,
  Menu,
  MoreHorizontal,
  Save,
  Settings2,
  User,
  X,
} from 'lucide-react';
import { ChatIcon, CardsIcon, ErrorIcon, MathIcon } from '../components/icons';
import { LoginScreen } from '../components/auth/LoginScreen';
import { ChatPanel } from '../components/chat';
import { ErrorPanel } from '../components/error';
import { FlashcardPanel } from '../components/flashcard';
import { FormulaPanel } from '../components/formula';
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

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-panel-inner rounded-full px-3 py-1.5 text-xs font-medium text-slate-500">
      {label && <><span className="text-slate-400">{label}</span>{' '}</>}
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
          <GlassContainer className="h-11 w-11 justify-center">
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
          <GlassContainer className="h-11 gap-0.5 px-1">
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
            className="mt-3 rounded-full glass-panel-inner px-4 py-2 min-h-[44px] text-sm font-medium text-slate-700"
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
    <div
      className="fixed inset-0 z-50 flex flex-col bg-[var(--surface-bg)] px-4 font-sans"
      style={{
        paddingTop: 'max(1.25rem, env(safe-area-inset-top))',
        paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
      }}
    >
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Mechanik Lerntool</div>
          <h2 className="text-2xl font-semibold text-slate-800">{title}</h2>
          {subtitle ? <p className="truncate text-sm text-slate-400">{subtitle}</p> : null}
        </div>
        <GlassContainer className="h-11 w-11 justify-center shrink-0">
          <GlassButton onClick={onClose} title="Schließen">
            <X size={18} />
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
              className={`w-full rounded-full px-6 min-h-[52px] text-left flex flex-col justify-center transition-all active:scale-[0.98] ${
                isActive
                  ? 'glass-panel text-slate-800'
                  : 'glass-panel-inner text-slate-500'
              }`}
            >
              <div className="text-sm font-medium">{task.title}</div>
            </button>
          );
        })}
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
              </div>
              <StatPill label="" value={`${done}/${themeTasks.length}`} />
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
                      className="task-row flex items-center gap-2 rounded-xl border border-white/70 bg-white/60 px-3 py-3"
                    >
                      <button
                        onClick={() => onOpenTask(task.id, undefined, sub.code)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="truncate text-sm font-medium text-slate-800">{task.title}</div>
                      </button>
                      <button
                        onClick={() => onCycleCheck(task.id)}
                        className="shrink-0 p-3 -m-3 flex items-center justify-center"
                        title="Status wechseln"
                      >
                        <span className={`led-dot ${state === 'green' ? 'led-dot-green' : state === 'yellow' ? 'led-dot-yellow' : 'led-dot-none'}`} />
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

const PROMPT_LABELS: { context: 'chat' | 'karteikarten' | 'fehler' | 'formeln'; label: string }[] = [
  { context: 'chat', label: 'Chat' },
  { context: 'karteikarten', label: 'Karteikarten' },
  { context: 'fehler', label: 'Fehler-Log' },
  { context: 'formeln', label: 'Formelsammlung' },
];

function MobileSettingsScreen({
  onClose,
  geminiKey,
  onSaveGemini,
  username,
  onLogout,
  darkMode,
  onToggleDarkMode,
  customPrompts,
  onSaveCustomPrompt,
}: {
  onClose: () => void;
  geminiKey: string;
  onSaveGemini: (key: string) => void;
  username: string;
  onLogout: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  customPrompts: Record<string, string>;
  onSaveCustomPrompt: (context: string, value: string) => void;
}) {
  const [keyValue, setKeyValue] = useState(geminiKey);
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSaveGemini(keyValue.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-[var(--surface-bg)] px-4 font-sans"
      style={{
        paddingTop: 'max(1.25rem, env(safe-area-inset-top))',
        paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
      }}
    >
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Mechanik Lerntool</div>
          <h2 className="text-2xl font-semibold text-slate-800">Einstellungen</h2>
        </div>
        <GlassContainer className="h-11 w-11 justify-center shrink-0">
          <GlassButton onClick={onClose} title="Schließen"><X size={18} /></GlassButton>
        </GlassContainer>
      </div>

      <div className="iphone-scroll flex-1 overflow-y-auto space-y-6 pb-2">

        {/* API Key */}
        <div className="space-y-2">
          <div className="px-1 text-xs uppercase tracking-[0.14em] text-slate-400">Google Gemini API Key</div>
          <GlassContainer className="h-11 w-full gap-1">
            <input
              type={showKey ? 'text' : 'password'}
              value={keyValue}
              onChange={(e) => { setKeyValue(e.target.value); setSaved(false); }}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="AIza..."
              className="flex-1 bg-transparent border-none px-3 text-sm text-slate-700 focus:outline-none placeholder:text-slate-400"
            />
            <GlassButton onClick={() => setShowKey((v) => !v)} title={showKey ? 'Verbergen' : 'Anzeigen'}>
              {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </GlassButton>
            <GlassButton onClick={handleSave} className={saved ? 'text-green-600' : ''}>
              {saved ? <Check size={14} /> : <Save size={14} />}
            </GlassButton>
          </GlassContainer>
        </div>

        {/* Appearance */}
        <div className="space-y-2">
          <div className="px-1 text-xs uppercase tracking-[0.14em] text-slate-400">Erscheinungsbild</div>
          <button
            onClick={onToggleDarkMode}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl glass-panel-inner text-left transition-all active:scale-[0.99]"
          >
            <span className="text-sm font-medium text-slate-800">Dunkles Design</span>
            <div className={`relative w-10 h-5 rounded-full transition-colors duration-300 shrink-0 ${darkMode ? 'bg-[var(--neo-green-base)]' : 'bg-slate-200'}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300 ${darkMode ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
          </button>
        </div>

        {/* KI-Prompts */}
        <div className="space-y-2">
          <div className="px-1 text-xs uppercase tracking-[0.14em] text-slate-400">KI-Prompts</div>
          {PROMPT_LABELS.map(({ context, label }) => (
            <div key={context} className="space-y-1">
              <div className="px-1 text-xs text-slate-500">{label}</div>
              <textarea
                value={customPrompts[context] ?? ''}
                onChange={(e) => onSaveCustomPrompt(context, e.target.value)}
                placeholder="Eigener Prompt..."
                rows={3}
                className="w-full glass-panel-inner rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none placeholder:text-slate-400 resize-y"
              />
            </div>
          ))}
        </div>

        {/* Account */}
        {username && (
          <div className="space-y-2">
            <div className="px-1 text-xs uppercase tracking-[0.14em] text-slate-400">Account</div>
            <div className="glass-panel-inner rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                <User size={15} className="text-slate-500" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{username}</p>
                <p className="text-xs text-slate-400">Eingeloggt</p>
              </div>
            </div>
            <button
              onClick={() => { onLogout(); onClose(); }}
              className="neo-btn-red rounded-full w-full flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all active:scale-95"
            >
              <LogOut size={14} />
              Abmelden
            </button>
          </div>
        )}
      </div>
    </div>
  );
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
  const [menuOpen, setMenuOpen] = useState(false);
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
    <div className="iphone-shell flex flex-col bg-[var(--surface-bg)] px-4 font-sans text-slate-800">
      {currentView === 'dashboard' ? (
        <div className="relative flex min-h-0 flex-1 flex-col">
          <header className="iphone-dashboard-header absolute top-0 left-0 right-0 z-10 flex items-center justify-between gap-3 px-1 pt-2">
            {selectedTaskTheme ? (
              <GlassContainer className="h-11 w-11 justify-center">
                <GlassButton onClick={() => setSelectedTaskTheme(null)} title="Zurück">
                  <ArrowLeft size={16} />
                </GlassButton>
              </GlassContainer>
            ) : (
              <div className="min-w-0">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Mechanik Lerntool</div>
                <h1 className="truncate text-xl font-semibold text-slate-800">
                  {dashboardTab === 'aufgaben' ? 'Aufgaben' : dashboardTab === 'karten' ? 'Karten' : dashboardTab === 'fehler' ? 'Fehler' : 'Formeln'}
                </h1>
              </div>
            )}
            <GlassContainer className="h-11 w-11 justify-center">
              <GlassButton onClick={() => setMenuOpen(true)} title="Menu">
                <Menu size={16} />
              </GlassButton>
            </GlassContainer>
          </header>

          <div className="iphone-scroll flex-1 overflow-y-auto pt-16 pb-6">
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
                          <GlassContainer className="h-11 w-11 justify-center">
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
                      <GlassContainer className="h-11 w-11 justify-center">
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
          <div className="relative flex min-h-0 flex-1 flex-col">
            <header className="iphone-task-header absolute top-0 left-0 right-0 z-10 px-1 pt-1">
              <div className="flex items-center gap-2">
                <GlassContainer className="h-11 w-11 justify-center shrink-0">
                  <GlassButton onClick={() => navigateTo('dashboard')} title="Zur Übersicht">
                    <ArrowLeft size={16} />
                  </GlassButton>
                </GlassContainer>

                <GlassContainer className="h-11 gap-0.5 px-1 flex-1">
                  <GlassButton onClick={goPrev} title="Vorherige Aufgabe">
                    <ChevronLeft size={16} />
                  </GlassButton>
                  <span className="flex-1 text-center text-sm font-medium text-slate-600">
                    {currentTaskIndex >= 0 ? currentTaskIndex + 1 : '-'} / {filteredTasks.length}
                  </span>
                  <GlassButton onClick={goNext} title="Nächste Aufgabe">
                    <ChevronRight size={16} />
                  </GlassButton>
                </GlassContainer>

                <GlassContainer className="h-11 gap-0.5 shrink-0">
                  <button
                    onClick={() => currentTaskId && handleCheckCycleForTask(currentTaskId)}
                    className={`h-9 w-9 shrink-0 rounded-full flex items-center justify-center transition-all ${
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
                  <GlassButton onClick={handleCopy} title="Markdown kopieren">
                    <Copy size={16} />
                  </GlassButton>
                  <GlassButton onClick={() => setTaskPickerOpen(true)} title="Aufgabenliste">
                    <MoreHorizontal size={16} />
                  </GlassButton>
                </GlassContainer>
              </div>
            </header>

            <div className="iphone-scroll flex-1 overflow-y-auto pt-16 pb-6">
              {taskLoading || !task ? (
                <div className="glass-panel-soft panel-radius p-5 text-sm text-slate-500">
                  Lade Aufgabe...
                </div>
              ) : (
                <div className="space-y-3">
                  <TaskPanel
                    title={task.title}
                    description={task.description}
                    givenLatex={task.given_latex}
                    imageUrl={task.image_url}
                  />

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

                  {/* Folder Tabs — identical to desktop */}
                  <div className="flex flex-col min-h-0">
                    <div className="flex relative z-10">
                      {TASK_TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        const isChatTab = tab.id === 1;
                        const isCardsTab = tab.id === 2;
                        const currentModelLabel = AI_MODELS.find((m) => m.id === selectedModel)?.label ?? tab.label;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => persistTaskTab(tab.id)}
                            title={tab.label}
                            className={`flex items-center gap-2 px-4 py-2 text-body font-medium transition-all duration-300 shrink-0 ${
                              isActive
                                ? 'active-tab text-slate-800 z-10'
                                : 'bg-transparent text-slate-500 border border-transparent'
                            } ${
                              tab.id === 1 ? 'rounded-tl-2xl rounded-tr-xl' : 'rounded-t-xl'
                            }`}
                            style={{
                              marginBottom: isActive ? '-2px' : '0',
                              paddingBottom: isActive ? 'calc(0.5rem + 2px)' : '0.5rem',
                            }}
                          >
                            <Icon className={`w-[18px] h-[18px] ${isActive ? 'text-slate-800' : 'text-slate-400'}`} />
                            {isActive && isChatTab ? (
                              <div className="relative flex items-center gap-1">
                                <span>{currentModelLabel}</span>
                                <ChevronDown size={13} className="text-slate-500 shrink-0" />
                                <select
                                  value={selectedModel}
                                  onChange={(e) => saveSelectedModel(e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="absolute inset-0 opacity-0 cursor-pointer w-full"
                                  style={{ fontFamily: 'inherit' }}
                                >
                                  {AI_MODELS.map((model) => (
                                    <option key={model.id} value={model.id}>{model.label}</option>
                                  ))}
                                </select>
                              </div>
                            ) : isActive && isCardsTab ? (
                              <div
                                className="flex items-center gap-1 cursor-pointer"
                                onClick={(e) => { e.stopPropagation(); persistCardSide(cardSide === 'front' ? 'back' : 'front'); }}
                              >
                                <span>{cardSide === 'front' ? 'Vorderseite' : 'Rückseite'}</span>
                                <ChevronDown size={13} className="text-slate-500 shrink-0" />
                              </div>
                            ) : isActive ? (
                              <span>{tab.label}</span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>

                    {/* Tab Content Panel */}
                    <div
                      className="glass-panel-soft panel-radius p-4 flex flex-col min-h-[420px]"
                      style={{
                        borderTopLeftRadius: activeTab === 1 ? '0' : 'var(--radius-panel)',
                      }}
                    >
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
                </div>
              )}
            </div>
          </div>
        </InlineAIContext.Provider>
      )}

      {menuOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-[var(--surface-bg)] px-4 font-sans"
          style={{
            paddingTop: 'max(1.25rem, env(safe-area-inset-top))',
            paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6 shrink-0">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Mechanik Lerntool</div>
              <h2 className="text-2xl font-semibold text-slate-800">Menü</h2>
            </div>
            <GlassContainer className="h-11 w-11 justify-center">
              <GlassButton onClick={() => setMenuOpen(false)} title="Schließen">
                <X size={18} />
              </GlassButton>
            </GlassContainer>
          </div>

          {/* Nav items — pill style (rounded-full = half-circle ends) */}
          <nav className="flex flex-col gap-2">
            {([
              { id: 'aufgaben' as DashboardTab, label: 'Aufgaben' },
              { id: 'karten' as DashboardTab, label: 'Karten' },
              { id: 'fehler' as DashboardTab, label: 'Fehler' },
              { id: 'formeln' as DashboardTab, label: 'Formeln' },
            ]).map((tab) => (
              <button
                key={tab.id}
                onClick={() => { persistDashboardTab(tab.id); setMenuOpen(false); }}
                className={`w-full rounded-full px-6 min-h-[52px] text-left flex items-center text-base font-medium transition-all active:scale-[0.98] ${
                  dashboardTab === tab.id ? 'glass-panel text-slate-800' : 'text-slate-500'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Spacer pushes settings to the bottom */}
          <div className="flex-1" />

          {/* Settings — pinned at bottom, also pill */}
          <button
            onClick={() => { setSettingsOpen(true); setMenuOpen(false); }}
            className="shrink-0 w-full rounded-full glass-panel-inner px-6 min-h-[52px] flex items-center justify-between active:scale-[0.98] transition-all"
          >
            <span className="text-base font-medium text-slate-500">Einstellungen</span>
            <Settings2 size={18} className="text-slate-400" />
          </button>
        </div>
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

      {settingsOpen && (
        <MobileSettingsScreen
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
      )}
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
