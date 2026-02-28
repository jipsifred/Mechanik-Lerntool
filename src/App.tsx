import { useState } from 'react';
import 'katex/dist/katex.min.css';

import { ChatIcon, CardsIcon, ErrorIcon, MathIcon } from './components/icons';
import { Header } from './components/layout/Header';
import { TaskPanel } from './components/task';
import { SubtaskList } from './components/task';
import { ChatPanel } from './components/chat';
import { useChat } from './hooks/useChat';
import { SUBTASKS } from './data/mockData';
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
  const [activeTab, setActiveTab] = useState(1);
  const [activePillOption, setActivePillOption] = useState('');
  const { messages, isTyping, inputValue, setInputValue, sendMessage, handleKeyDown } = useChat();

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#f8f8fa] relative flex flex-col p-4 gap-4 font-sans text-slate-800">
      {/* Header */}
      <Header activePillOption={activePillOption} onPillChange={setActivePillOption} />

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex gap-4 min-h-0">
        {/* Left Panel */}
        <TaskPanel />

        {/* Right Panels */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {/* Top Right Panel - Subtasks */}
          <div className="flex-1 glass-panel-soft rounded-2xl p-6 flex flex-col min-h-0">
            <SubtaskList subtasks={SUBTASKS} isSolved={activePillOption === 'solve'} />
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
