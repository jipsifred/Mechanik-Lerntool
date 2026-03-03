import { useState, useCallback, useRef, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import 'katex/dist/katex.min.css';

import { ChatIcon, CardsIcon, ErrorIcon, MathIcon } from './components/icons';
import { Header } from './components/layout/Header';
import { TaskSidebar } from './components/layout/TaskSidebar';
import { TaskPanel } from './components/task';
import { SubtaskList } from './components/task';
import { ChatPanel } from './components/chat';
import { FlashcardPanel } from './components/flashcard';
import { ErrorPanel } from './components/error';
import { DashboardView } from './components/dashboard';
import { SettingsModal } from './components/settings';
import { LoginScreen } from './components/auth/LoginScreen';
import { AuthProvider } from './context/AuthContext';
import { useChat } from './hooks/useChat';
import { useTask } from './hooks/useTask';
import { useTaskList } from './hooks/useTaskList';
import { useSettings } from './hooks/useSettings';
import { useAuth } from './hooks/useAuth';
import { useUserProgress } from './hooks/useUserProgress';
import { useFlashcards } from './hooks/useFlashcards';
import { useErrors } from './hooks/useErrors';
import { AI_MODELS } from './data/mockData';
import type { TabConfig } from './types';

const TABS: TabConfig[] = [
  { id: 1, label: 'Chat', icon: ChatIcon },
  { id: 2, label: 'Karten', icon: CardsIcon },
  { id: 3, label: 'Fehler', icon: ErrorIcon },
  { id: 4, label: 'Formeln', icon: MathIcon },
];

const TAB_PLACEHOLDER: Record<number, string> = {
  2: 'Karteikarten',
  3: 'Fehlerlog',
  4: 'Formelsammlung',
};

function AppContent() {
  const { user, isLoading, logout } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-screen overflow-hidden bg-[#f8f8fa] flex items-center justify-center font-sans text-slate-800">
        <div className="glass-panel-soft panel-radius p-8">
          <span className="text-slate-400 text-sm">Laden...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return <MainApp onLogout={logout} username={user.username} />;
}

function MainApp({ onLogout, username }: { onLogout: () => void; username: string }) {
  const [currentView, setCurrentView] = useState<'dashboard' | 'task'>(
    () => (localStorage.getItem('currentView') as 'dashboard' | 'task') || 'dashboard'
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    const stored = localStorage.getItem('activeTab');
    return stored ? parseInt(stored, 10) : 1;
  });
  const [activePillOption, setActivePillOption] = useState('');
  const [cardSide, setCardSide] = useState<'front' | 'back'>('back');
  const { geminiKey, saveGeminiKey, selectedModel, saveSelectedModel } = useSettings();
  const { tasks: allTasks } = useTaskList();
  const { markSubtaskSolved, isSubtaskSolved, markTaskInProgress } = useUserProgress();
  const sidebarOpen = activePillOption === 'more';
  const flashcards = useFlashcards();
  const errors = useErrors();

  // ── Category filter + navigation ───────────────────────
  const [categoryFilter, setCategoryFilter] = useState<string | null>(
    () => localStorage.getItem('categoryFilter')
  );
  const [filteredIndex, setFilteredIndex] = useState(() => {
    const stored = localStorage.getItem('filteredIndex');
    return stored ? parseInt(stored, 10) : 0;
  });

  const filteredTasks = useMemo(() => {
    if (!categoryFilter) return allTasks;
    return allTasks.filter(t => t.category === categoryFilter);
  }, [allTasks, categoryFilter]);

  const currentTaskId = filteredTasks[filteredIndex]?.id ?? null;

  const { task, subtasks, apiSubtasks, loading } = useTask(currentTaskId);
  const { messages, isTyping, inputValue, setInputValue, sendMessage, handleKeyDown } = useChat(geminiKey, task, apiSubtasks, selectedModel);

  const persistIndex = (i: number) => {
    setFilteredIndex(i);
    localStorage.setItem('filteredIndex', String(i));
  };

  const persistTab = (tab: number) => {
    setActiveTab(tab);
    localStorage.setItem('activeTab', String(tab));
  };

  const persistCategory = (cat: string | null) => {
    setCategoryFilter(cat);
    if (cat) localStorage.setItem('categoryFilter', cat);
    else localStorage.removeItem('categoryFilter');
  };

  const goNext = useCallback(() => {
    setFilteredIndex(i => {
      const next = i < filteredTasks.length - 1 ? i + 1 : i;
      localStorage.setItem('filteredIndex', String(next));
      return next;
    });
  }, [filteredTasks.length]);

  const goPrev = useCallback(() => {
    setFilteredIndex(i => {
      const next = i > 0 ? i - 1 : i;
      localStorage.setItem('filteredIndex', String(next));
      return next;
    });
  }, []);

  const goToFilteredIndex = useCallback((index: number) => {
    persistIndex(index);
  }, []);

  // ── Split pane ─────────────────────────────────────────
  const [splitRatio, setSplitRatio] = useState(0.5);
  const splitRatioRef = useRef(0.5);
  const rightPanelRef = useRef<HTMLDivElement>(null);

  const handlePrev = () => { setActivePillOption(''); goPrev(); };
  const handleNext = () => { setActivePillOption(''); goNext(); };

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const panel = rightPanelRef.current;
    if (!panel) return;

    const onMove = (ev: MouseEvent) => {
      const rect = panel.getBoundingClientRect();
      const next = Math.min(0.8, Math.max(0.2, (ev.clientY - rect.top) / rect.height));
      splitRatioRef.current = next;
      setSplitRatio(next);
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, []);

  const navigateTo = async (view: 'dashboard' | 'task') => {
    if (view === 'dashboard') {
      await errors.flushSaves();
    }
    setCurrentView(view);
    localStorage.setItem('currentView', view);
    if (view === 'task' && task) {
      markTaskInProgress(task.id);
    }
  };

  const handleNavigateToTask = (taskId: number, category: string | null, tab?: number) => {
    persistCategory(category);
    const filtered = category ? allTasks.filter(t => t.category === category) : allTasks;
    const idx = filtered.findIndex(t => t.id === taskId);
    persistIndex(idx >= 0 ? idx : 0);
    if (tab) persistTab(tab);
    navigateTo('task');
  };

  if (currentView === 'dashboard') {
    return (
      <div className="h-screen w-screen overflow-hidden bg-[#f8f8fa] relative flex flex-col p-4 gap-4 font-sans text-slate-800">
        <DashboardView
          onNavigateToTask={handleNavigateToTask}
          onOpenSettings={() => setSettingsOpen(true)}
        />
        <SettingsModal
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          geminiKey={geminiKey}
          onSaveGemini={saveGeminiKey}
          username={username}
          onLogout={onLogout}
        />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#f8f8fa] relative flex flex-col p-4 gap-4 font-sans text-slate-800">
      {/* Header */}
      <Header
        activePillOption={activePillOption}
        onPillChange={setActivePillOption}
        currentTask={filteredIndex + 1}
        totalTasks={filteredTasks.length}
        onPrev={handlePrev}
        onNext={handleNext}
        onDashboard={() => navigateTo('dashboard')}
        onGoToTask={goToFilteredIndex}
      />

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex gap-4 min-h-0">
        {/* Left Panel */}
        {loading || !task ? (
          <div className="flex-1 glass-panel-soft panel-radius p-6 flex items-center justify-center min-w-0">
            <span className="text-slate-400">Lade Aufgabe...</span>
          </div>
        ) : (
          <TaskPanel
            title={task.title}
            description={task.description}
            givenLatex={task.given_latex}
            imageUrl={task.image_url}
          />
        )}

        {/* Right Panels */}
        <div ref={rightPanelRef} className="flex-1 flex flex-col min-w-0 min-h-0">
          {/* Top Right Panel - Subtasks */}
          <div className="glass-panel-soft panel-radius p-6 flex flex-col min-h-0 overflow-y-auto" style={{ flex: `${splitRatio} 1 0%` }}>
            <SubtaskList
              subtasks={subtasks}
              apiSubtasks={apiSubtasks}
              onSubtaskSolved={markSubtaskSolved}
              isSubtaskSolved={isSubtaskSolved}
            />
          </div>

          {/* Drag Handle */}
          <div
            onMouseDown={handleDragStart}
            className="h-3 shrink-0 cursor-row-resize"
          />

          {/* Bottom Right Panel with Folder Tabs */}
          <div className="flex flex-col min-h-0 relative" style={{ flex: `${1 - splitRatio} 1 0%` }}>
            {/* Folder Tabs */}
            <div className="flex relative z-10">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                const isChatTab = tab.id === 1;
                const isCardsTab = tab.id === 2;
                const currentModelLabel = AI_MODELS.find(m => m.id === selectedModel)?.label ?? tab.label;
                return (
                  <button
                    key={tab.id}
                    onClick={() => persistTab(tab.id)}
                    title={tab.label}
                    className={`flex items-center gap-2 px-4 py-2 text-body font-medium transition-all duration-300 shrink-0 ${
                      isActive
                        ? 'active-tab text-slate-800 z-10'
                        : 'bg-transparent text-slate-500 hover:bg-slate-200/50 border border-transparent'
                    } ${
                      tab.id === 1 ? 'rounded-tl-2xl rounded-tr-xl' : 'rounded-t-xl'
                    }`}
                    style={{
                      marginBottom: isActive ? '-2px' : '0',
                      paddingBottom: isActive ? 'calc(0.5rem + 2px)' : '0.5rem'
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
                          {AI_MODELS.map(m => (
                            <option key={m.id} value={m.id}>{m.label}</option>
                          ))}
                        </select>
                      </div>
                    ) : isActive && isCardsTab ? (
                      <div
                        className="flex items-center gap-1 cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); setCardSide(prev => prev === 'front' ? 'back' : 'front'); }}
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
              className="flex-1 glass-panel-soft panel-radius p-6 flex flex-col relative z-0 min-h-0"
              style={{
                borderTopLeftRadius: activeTab === 1 ? '0' : 'var(--radius-panel)'
              }}
            >
              {activeTab === 1 ? (
                <ChatPanel
                  messages={messages}
                  isTyping={isTyping}
                  inputValue={inputValue}
                  onInputChange={setInputValue}
                  onSend={sendMessage}
                  onKeyDown={handleKeyDown}
                />
              ) : activeTab === 2 && task ? (
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
                  onLoadOrInit={flashcards.loadOrInitCard}
                  onUpdateSection={flashcards.updateSection}
                />
              ) : activeTab === 3 && task ? (
                <ErrorPanel
                  taskId={task.id}
                  errors={errors.taskErrors}
                  saving={errors.saving}
                  saved={errors.saved}
                  onLoad={errors.loadTaskErrors}
                  onAdd={errors.addError}
                  onUpdate={errors.updateError}
                  onDelete={errors.deleteError}
                />
              ) : (
                <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center text-slate-500">
                  <p className="text-title">
                    {TAB_PLACEHOLDER[activeTab]}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Task Sidebar */}
        <TaskSidebar
          tasks={filteredTasks}
          currentIndex={filteredIndex}
          isOpen={sidebarOpen}
          onSelect={(index) => { goToFilteredIndex(index); setActivePillOption(''); }}
        />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
