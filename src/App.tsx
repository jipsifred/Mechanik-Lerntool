import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import 'katex/dist/katex.min.css';

import { ChatIcon, CardsIcon, ErrorIcon, MathIcon } from './components/icons';
import { Header } from './components/layout/Header';
import { TaskPanel } from './components/task';
import { SubtaskList } from './components/task';
import { ChatPanel } from './components/chat';
import { DashboardView } from './components/dashboard';
import { SettingsModal } from './components/settings';
import { useChat } from './hooks/useChat';
import { useTask } from './hooks/useTask';
import { useSettings } from './hooks/useSettings';
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

export default function App() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'task'>('dashboard');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(1);
  const [activePillOption, setActivePillOption] = useState('');
  const { geminiKey, saveGeminiKey, selectedModel, saveSelectedModel } = useSettings();
  const { task, subtasks, apiSubtasks, currentIndex, totalTasks, loading, goNext, goPrev, goToIndex } = useTask();
  const { messages, isTyping, inputValue, setInputValue, sendMessage, handleKeyDown } = useChat(geminiKey, task, apiSubtasks, selectedModel);

  const handlePrev = () => { setActivePillOption(''); goPrev(); };
  const handleNext = () => { setActivePillOption(''); goNext(); };

  if (currentView === 'dashboard') {
    return (
      <div className="h-screen w-screen overflow-hidden bg-[#f8f8fa] relative flex flex-col p-4 gap-4 font-sans text-slate-800">
        <DashboardView
          onNavigateToTask={(index) => { goToIndex(index); setCurrentView('task'); }}
          onOpenSettings={() => setSettingsOpen(true)}
        />
        <SettingsModal
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          geminiKey={geminiKey}
          onSaveGemini={saveGeminiKey}
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
        currentTask={currentIndex + 1}
        totalTasks={totalTasks}
        onPrev={handlePrev}
        onNext={handleNext}
        onDashboard={() => setCurrentView('dashboard')}
      />

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex gap-4 min-h-0">
        {/* Left Panel */}
        {loading || !task ? (
          <div className="flex-1 glass-panel-soft panel-radius p-6 flex items-center justify-center">
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
        <div className="flex-1 flex flex-col gap-4 min-w-0 min-h-0">
          {/* Top Right Panel - Subtasks */}
          <div className="flex-1 glass-panel-soft panel-radius p-6 flex flex-col min-h-0">
            <SubtaskList subtasks={subtasks} isSolved={activePillOption === 'solve'} />
          </div>

          {/* Bottom Right Panel with Folder Tabs */}
          <div className="flex-1 flex flex-col min-h-0 relative">
            {/* Folder Tabs */}
            <div className="flex relative z-10">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                const isChatTab = tab.id === 1;
                const currentModelLabel = AI_MODELS.find(m => m.id === selectedModel)?.label ?? tab.label;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
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
      </main>
    </div>
  );
}
