import { useState, useEffect, type CSSProperties } from 'react';
import { motion } from 'motion/react';
import { Settings, ChevronDown, ChevronRight, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { InlineMath } from 'react-katex';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import { GlassContainer, GlassButton, MarkdownMath } from '../ui';
import { CardsIcon, ErrorIcon } from '../icons';
import { useTaskList } from '../../hooks/useTaskList';
import { useFlashcards } from '../../hooks/useFlashcards';
import { useGlassAngle } from '../../hooks/useGlassAngle';
import { CHAPTERS } from '../../data/mockData';
import type { DashboardTabId, DashboardViewProps, Flashcard, FlashcardSection } from '../../types';

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

function getChapterForTask(taskId: number): number {
  if (taskId <= 90) return 1;
  if (taskId <= 180) return 2;
  return 3;
}

function parseSections(back: string): FlashcardSection[] {
  try {
    const parsed = JSON.parse(back);
    if (Array.isArray(parsed)) return parsed;
  } catch { /* not JSON */ }
  return [];
}

function CardReviewView({ card, onBack, onNavigateToTask }: {
  card: Flashcard;
  onBack: () => void;
  onNavigateToTask: (index: number) => void;
}) {
  const sections = parseSections(card.back);
  const [revealedCount, setRevealedCount] = useState(0);

  return (
    <div className="flex-1 glass-panel-soft panel-radius p-6 flex flex-col min-h-0">
      <div className="flex items-center gap-3 mb-4 shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-body text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft size={16} />
          Zurück
        </button>
        {card.task_id && (
          <button
            onClick={() => onNavigateToTask(card.task_id! - 1)}
            className="ml-auto text-label text-slate-500 hover:text-slate-700 transition-colors underline"
          >
            Zur Aufgabe
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-3">
        {/* Front side summary */}
        <div className="bg-white/40 rounded-xl border border-white/60 p-4 text-body text-slate-700">
          <div className="font-semibold text-slate-800 mb-1">
            <MarkdownMath text={card.front} />
          </div>
        </div>

        {/* Sections with progressive reveal */}
        {sections.map((section, i) => {
          const isRevealed = i < revealedCount;
          return (
            <div key={i} className="flex flex-col gap-1.5">
              <div className="text-label font-semibold text-slate-600 px-1">
                <MarkdownMath text={section.label} />
              </div>
              {isRevealed ? (
                <div className="bg-white/50 rounded-lg border border-white/60 p-3 markdown-body">
                  <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>
                    {section.content || '*Noch kein Lösungsansatz*'}
                  </ReactMarkdown>
                </div>
              ) : (
                <div
                  className="bg-slate-200/60 rounded-lg border border-slate-200/80 p-3 select-none"
                  style={{ filter: 'blur(4px)', WebkitFilter: 'blur(4px)' }}
                >
                  <span className="text-body text-slate-400">████████████████████████</span>
                </div>
              )}
            </div>
          );
        })}

        {sections.length > 0 && revealedCount < sections.length && (
          <button
            onClick={() => setRevealedCount(prev => prev + 1)}
            className="self-center mt-2 flex items-center gap-1.5 px-4 py-2 rounded-full text-body font-medium neo-btn-green-vivid transition-all duration-200"
          >
            <Eye size={15} />
            Aufdecken
            <ChevronRight size={14} />
          </button>
        )}
        {revealedCount > 0 && revealedCount >= sections.length && (
          <button
            onClick={() => setRevealedCount(0)}
            className="self-center mt-2 flex items-center gap-1.5 px-4 py-2 rounded-full text-body font-medium neo-btn-gray transition-all duration-200"
          >
            <EyeOff size={15} />
            Wieder verdecken
          </button>
        )}
      </div>
    </div>
  );
}

export function DashboardView({ onNavigateToTask, onOpenSettings }: DashboardViewProps) {
  const [activeTab, setActiveTab] = useState<DashboardTabId>('aufgaben');
  const { tasks, loading: tasksLoading } = useTaskList();
  const { allCards, loadAllCards } = useFlashcards();
  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(new Set([1]));
  const [reviewCard, setReviewCard] = useState<Flashcard | null>(null);

  useEffect(() => {
    if (activeTab === 'karten') {
      loadAllCards();
    }
  }, [activeTab, loadAllCards]);

  const toggleChapter = (id: number) => {
    setExpandedChapters(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const cardsByChapter = (chapterId: number) =>
    allCards.filter(c => c.task_id && getChapterForTask(c.task_id) === chapterId);

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
          reviewCard ? (
            <CardReviewView
              card={reviewCard}
              onBack={() => setReviewCard(null)}
              onNavigateToTask={onNavigateToTask}
            />
          ) : (
            <div className="flex-1 overflow-y-auto space-y-3 px-2 pb-8 pt-2">
              {allCards.length === 0 ? (
                <div className="glass-panel-soft panel-radius p-6 flex items-center justify-center min-h-[200px]">
                  <div className="text-center text-slate-500">
                    <CardsIcon className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                    <p className="text-title font-medium">Noch keine Karteikarten</p>
                    <p className="text-body mt-2">Öffne eine Aufgabe und nutze den Karten-Tab, um Lösungsansätze zu schreiben.</p>
                  </div>
                </div>
              ) : (
                CHAPTERS.map((chapter) => {
                  const cards = cardsByChapter(chapter.id);
                  const isExpanded = expandedChapters.has(chapter.id);
                  return (
                    <div key={chapter.id} className="glass-panel-soft panel-radius border border-white/60 overflow-hidden">
                      <button
                        onClick={() => toggleChapter(chapter.id)}
                        className="w-full p-4 flex items-center justify-between hover:bg-white/40 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <ChevronDown
                            size={16}
                            className={`text-slate-400 transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'}`}
                          />
                          <span className="text-heading font-medium text-slate-800">{chapter.title}</span>
                        </div>
                        <span className="text-label text-slate-400">
                          {cards.length} {cards.length === 1 ? 'Karte' : 'Karten'}
                        </span>
                      </button>
                      {isExpanded && cards.length > 0 && (
                        <div className="border-t border-white/60 px-4 pb-3 pt-2 space-y-2">
                          {cards.map((card) => {
                            const sections = parseSections(card.back);
                            const filledCount = sections.filter(s => s.content.trim().length > 0).length;
                            return (
                              <div
                                key={card.id}
                                onClick={() => setReviewCard(card)}
                                className="bg-white/40 rounded-xl border border-white/60 p-3 cursor-pointer hover:bg-white/60 hover:shadow-sm transition-all duration-200 flex items-center justify-between"
                              >
                                <div className="min-w-0">
                                  <p className="text-body font-medium text-slate-700 truncate">
                                    {card.front || `Aufgabe ${card.task_id}`}
                                  </p>
                                  <p className="text-hint text-slate-400 mt-0.5">
                                    {filledCount}/{sections.length} Teilaufgaben bearbeitet
                                  </p>
                                </div>
                                <ChevronRight size={16} className="text-slate-300 shrink-0" />
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {isExpanded && cards.length === 0 && (
                        <div className="border-t border-white/60 px-4 py-4 text-body text-slate-400 text-center">
                          Noch keine Karten in diesem Kapitel.
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )
        )}
      </div>
    </main>
    </div>
  );
}
