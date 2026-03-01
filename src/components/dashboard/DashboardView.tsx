import { useState, type CSSProperties } from 'react';
import { motion } from 'motion/react';
import { Settings } from 'lucide-react';
import { InlineMath } from 'react-katex';
import { GlassContainer, GlassButton } from '../ui';
import { CardsIcon, ErrorIcon } from '../icons';
import { useTaskList } from '../../hooks/useTaskList';
import { useGlassAngle } from '../../hooks/useGlassAngle';
import type { DashboardTabId, DashboardViewProps } from '../../types';

function ActiveTabIndicator() {
  const { ref, angle } = useGlassAngle();
  return (
    <div
      ref={ref}
      className="w-full h-full rounded-full dashboard-pill-shell"
      style={{ '--g-angle': `${angle}deg`, '--g-stop2': '35%', '--g-stop3': '65%' } as CSSProperties}
    />
  );
}

const SIDEBAR_TABS: { id: DashboardTabId; label: string }[] = [
  { id: 'aufgaben', label: 'Aufgaben' },
  { id: 'formeln', label: 'Formelsammlung' },
  { id: 'fehler', label: 'Fehlerlog' },
  { id: 'karten', label: 'Karteikarten' },
];

export function DashboardView({ onNavigateToTask, onOpenSettings }: DashboardViewProps) {
  const [activeTab, setActiveTab] = useState<DashboardTabId>('aufgaben');
  const { tasks, loading: tasksLoading } = useTaskList();

  return (
    <div className="flex-1 min-h-0">
    <main className="relative z-10 h-full flex gap-6 mt-2">
      {/* Left Sidebar */}
      <div className="w-56 glass-panel-soft panel-radius p-3 flex flex-col gap-1.5 shrink-0">
        {SIDEBAR_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative h-9 px-4 rounded-full text-left text-heading font-medium flex items-center transition-colors duration-300 ${
                isActive ? 'text-slate-800' : 'text-slate-600 hover:bg-white/50'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeDashboardTab"
                  className="absolute inset-0 z-0"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                >
                  <ActiveTabIndicator />
                </motion.div>
              )}
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}

        <div className="mt-auto pt-1.5">
          <GlassContainer className="h-10 w-10 justify-center">
            <GlassButton onClick={onOpenSettings} title="Einstellungen" className="active:scale-95">
              <Settings size={16} />
            </GlassButton>
          </GlassContainer>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {activeTab === 'aufgaben' && (
          <div className="flex-1 overflow-y-auto space-y-4 px-2 pb-8 pt-2">
            <div
              onClick={() => onNavigateToTask(0)}
              className="glass-panel-soft panel-radius p-5 flex items-center justify-between cursor-pointer hover:bg-white/80 transition-all duration-300 border border-white/60 hover:shadow-md group"
            >
              <div>
                <h3 className="text-title font-medium text-slate-800 group-hover:text-slate-900 transition-colors">
                  Alle Aufgaben
                </h3>
                <p className="text-body text-slate-500 mt-1">
                  {tasksLoading ? '...' : `${tasks.length} Aufgaben`}
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'formeln' && (
          <div className="flex-1 glass-panel-soft panel-radius p-6 flex flex-col min-h-0">
            <ul className="space-y-3 overflow-y-auto flex-1 pr-2">
              <li className="text-body text-slate-600 bg-white/40 p-4 rounded-xl border border-white/60 flex flex-col gap-2">
                <span className="font-medium text-slate-700">d'Alembertsche Hilfskraft</span>
                <div className="bg-white/50 px-3 py-2 rounded-lg text-center">
                  <InlineMath math="F_H = -m \cdot a" />
                </div>
              </li>
              <li className="text-body text-slate-600 bg-white/40 p-4 rounded-xl border border-white/60 flex flex-col gap-2">
                <span className="font-medium text-slate-700">Trägheitsmoment Vollzylinder</span>
                <div className="bg-white/50 px-3 py-2 rounded-lg text-center">
                  <InlineMath math="J = \frac{1}{2} m r^2" />
                </div>
              </li>
            </ul>
          </div>
        )}

        {activeTab === 'fehler' && (
          <div className="flex-1 glass-panel-soft panel-radius p-6 flex flex-col min-h-0">
            <ul className="space-y-3 overflow-y-auto flex-1 pr-2">
              <li className="text-body text-slate-600 bg-white/40 p-4 rounded-xl border border-white/60">
                <div className="font-medium text-red-500 mb-1 flex items-center gap-2">
                  <ErrorIcon className="w-4 h-4" /> Aufgabe 1.2
                </div>
                Vorzeichenfehler bei der d'Alembertschen Hilfskraft
              </li>
              <li className="text-body text-slate-600 bg-white/40 p-4 rounded-xl border border-white/60">
                <div className="font-medium text-red-500 mb-1 flex items-center gap-2">
                  <ErrorIcon className="w-4 h-4" /> Aufgabe 2.1
                </div>
                Trägheitsmoment des Zylinders falsch eingesetzt
              </li>
            </ul>
          </div>
        )}

        {activeTab === 'karten' && (
          <div className="flex-1 glass-panel-soft panel-radius p-6 flex items-center justify-center min-h-0">
            <div className="text-center text-slate-500">
              <CardsIcon className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p className="text-title font-medium">Karteikarten Modus</p>
              <p className="text-body mt-2">Wähle ein Kapitel aus, um zu starten.</p>
            </div>
          </div>
        )}
      </div>
    </main>
    </div>
  );
}
