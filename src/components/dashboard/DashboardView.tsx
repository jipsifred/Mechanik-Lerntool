import { useState } from 'react';
import { motion } from 'motion/react';
import { Settings } from 'lucide-react';
import { InlineMath } from 'react-katex';
import { GlassContainer, GlassButton } from '../ui';
import { CardsIcon, ErrorIcon } from '../icons';
import { CHAPTERS } from '../../data/mockData';
import type { DashboardTabId, DashboardViewProps } from '../../types';

const SIDEBAR_TABS: { id: DashboardTabId; label: string }[] = [
  { id: 'aufgaben', label: 'Aufgaben' },
  { id: 'formeln', label: 'Formelsammlung' },
  { id: 'fehler', label: 'Fehlerlog' },
  { id: 'karten', label: 'Karteikarten' },
];

export function DashboardView({ onNavigateToTask, onOpenSettings }: DashboardViewProps) {
  const [activeTab, setActiveTab] = useState<DashboardTabId>('aufgaben');

  return (
    <div className="flex-1 flex flex-col min-h-0">
    <main className="relative z-10 flex-1 flex gap-6 min-h-0 mt-2">
      {/* Left Sidebar */}
      <div className="w-56 glass-panel-soft rounded-2xl p-3 flex flex-col gap-1.5 shrink-0 h-fit">
        {SIDEBAR_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative h-9 px-4 rounded-full text-left text-[13px] font-medium flex items-center transition-colors duration-300 ${
                isActive ? 'text-slate-800' : 'text-slate-600 hover:bg-white/50'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeDashboardTab"
                  className="absolute inset-0 z-0"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                >
                  <div
                    className="w-full h-full glass-panel rounded-full"
                    style={{ '--g-angle': '115deg', '--g-stop2': '35%', '--g-stop3': '65%' } as React.CSSProperties}
                  />
                </motion.div>
              )}
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {activeTab === 'aufgaben' && (
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 pb-4">
            {CHAPTERS.map((chapter) => {
              const progress = chapter.taskCount > 0
                ? (chapter.completedCount / chapter.taskCount) * 100
                : 0;
              const r = 20;
              const circumference = 2 * Math.PI * r;
              return (
                <div
                  key={chapter.id}
                  onClick={onNavigateToTask}
                  className="glass-panel-soft rounded-2xl p-5 flex items-center justify-between cursor-pointer hover:bg-white/80 transition-all duration-300 border border-white/60 hover:shadow-md group"
                >
                  <div>
                    <h3 className="text-lg font-medium text-slate-800 group-hover:text-slate-900 transition-colors">
                      {chapter.title}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">{chapter.taskCount} Aufgaben</p>
                  </div>

                  {/* Circular Progress */}
                  <GlassContainer className="w-14 h-14 justify-center shrink-0 relative shadow-sm">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 48 48">
                      <circle
                        cx="24" cy="24" r={r}
                        stroke="currentColor" strokeWidth="3" fill="transparent"
                        className="text-white/80"
                      />
                      <circle
                        cx="24" cy="24" r={r}
                        stroke="currentColor" strokeWidth="4" fill="transparent"
                        strokeDasharray={circumference}
                        strokeDashoffset={circumference - (progress / 100) * circumference}
                        strokeLinecap="round"
                        className="text-[#529669] transition-all duration-1000 ease-out drop-shadow-[0_2px_6px_rgba(139,233,168,0.6)]"
                      />
                    </svg>
                    <span className="absolute text-[12px] font-bold text-[#2d7a4a]">
                      {chapter.completedCount}/{chapter.taskCount}
                    </span>
                  </GlassContainer>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'formeln' && (
          <div className="flex-1 glass-panel-soft rounded-2xl p-6 flex flex-col min-h-0">
            <ul className="space-y-3 overflow-y-auto flex-1 pr-2">
              <li className="text-sm text-slate-600 bg-white/40 p-4 rounded-xl border border-white/60 flex flex-col gap-2">
                <span className="font-medium text-slate-700">d'Alembertsche Hilfskraft</span>
                <div className="bg-white/50 px-3 py-2 rounded-lg text-center">
                  <InlineMath math="F_H = -m \cdot a" />
                </div>
              </li>
              <li className="text-sm text-slate-600 bg-white/40 p-4 rounded-xl border border-white/60 flex flex-col gap-2">
                <span className="font-medium text-slate-700">Trägheitsmoment Vollzylinder</span>
                <div className="bg-white/50 px-3 py-2 rounded-lg text-center">
                  <InlineMath math="J = \frac{1}{2} m r^2" />
                </div>
              </li>
            </ul>
          </div>
        )}

        {activeTab === 'fehler' && (
          <div className="flex-1 glass-panel-soft rounded-2xl p-6 flex flex-col min-h-0">
            <ul className="space-y-3 overflow-y-auto flex-1 pr-2">
              <li className="text-sm text-slate-600 bg-white/40 p-4 rounded-xl border border-white/60">
                <div className="font-medium text-red-500 mb-1 flex items-center gap-2">
                  <ErrorIcon className="w-4 h-4" /> Aufgabe 1.2
                </div>
                Vorzeichenfehler bei der d'Alembertschen Hilfskraft
              </li>
              <li className="text-sm text-slate-600 bg-white/40 p-4 rounded-xl border border-white/60">
                <div className="font-medium text-red-500 mb-1 flex items-center gap-2">
                  <ErrorIcon className="w-4 h-4" /> Aufgabe 2.1
                </div>
                Trägheitsmoment des Zylinders falsch eingesetzt
              </li>
            </ul>
          </div>
        )}

        {activeTab === 'karten' && (
          <div className="flex-1 glass-panel-soft rounded-2xl p-6 flex items-center justify-center min-h-0">
            <div className="text-center text-slate-500">
              <CardsIcon className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p className="text-lg font-medium">Karteikarten Modus</p>
              <p className="text-sm mt-2">Wähle ein Kapitel aus, um zu starten.</p>
            </div>
          </div>
        )}
      </div>
    </main>

    {/* Settings Button — bottom left */}
    <div className="mt-2 flex items-center">
      <GlassContainer className="h-9 w-9 justify-center">
        <GlassButton onClick={onOpenSettings} title="Einstellungen" className="active:scale-95">
          <Settings size={16} />
        </GlassButton>
      </GlassContainer>
    </div>
    </div>
  );
}
