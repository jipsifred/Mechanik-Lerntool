import { useState } from 'react';
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
import { AI_MODELS, DEFAULT_MODEL_ID } from './data/mockData';
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
  const [selectedModelId, setSelectedModelId] = useState(DEFAULT_MODEL_ID);
  const { geminiKey, groqKey, saveGeminiKey, saveGroqKey } = useSettings();
  const { task, subtasks, currentIndex, totalTasks, loading, goNext, goPrev } = useTask();

  const selectedModel = AI_MODELS.find(m => m.id === selectedModelId) ?? AI_MODELS[0];
  const apiKey = selectedModel.provider === 'gemini' ? geminiKey : groqKey;
  const { messages, isTyping, inputValue, setInputValue, sendMessage, handleKeyDown } = useChat(apiKey, task, selectedModel.id, selectedModel.provider);

  const handlePrev = () => { setActivePillOption(''); goPrev(); };
  const handleNext = () => { setActivePillOption(''); goNext(); };

  if (currentView === 'dashboard') {
    return (
      <div className="h-screen w-screen overflow-hidden bg-[#f8f8fa] relative flex flex-col p-4 gap-4 font-sans text-slate-800">
        <DashboardView
          onNavigateToTask={() => setCurrentView('task')}
          onOpenSettings={() => setSettingsOpen(true)}
        />
        <SettingsModal
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          geminiKey={geminiKey}
          groqKey={groqKey}
          onSaveGemini={saveGeminiKey}
          onSaveGroq={saveGroqKey}
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
          <div className="flex-1 glass-panel-soft rounded-2xl p-6 flex items-center justify-center">
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
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {/* Top Right Panel - Subtasks */}
          <div className="flex-1 glass-panel-soft rounded-2xl p-6 flex flex-col min-h-0">
            <SubtaskList subtasks={subtasks} isSolved={activePillOption === 'solve'} />
          </div>

          {/* Bottom Right Panel with Folder Tabs */}
          <div className="flex-1 flex flex-col min-h-0 relative">
            {/* Folder Tabs */}
            <div className="flex relative z-10">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    title={tab.label}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all duration-300 shrink-0 ${
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
                    {isActive && <span>{tab.label}</span>}
                  </button>
                );
              })}
            </div>

            {/* Tab Content Panel */}
            <div
              className="flex-1 glass-panel-soft rounded-2xl p-6 flex flex-col relative z-0 min-h-0"
              style={{
                borderTopLeftRadius: activeTab === 1 ? '0' : '1rem'
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
                  selectedModelId={selectedModelId}
                  onModelChange={setSelectedModelId}
                />
              ) : (
                <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center text-slate-500">
                  <p className="text-lg">
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
