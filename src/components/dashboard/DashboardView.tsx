import { useState, useEffect, useCallback, type CSSProperties, type MouseEvent as ReactMouseEvent } from 'react';
import { motion } from 'motion/react';
import { Settings, ChevronDown, ChevronRight, ChevronLeft, Eye, EyeOff, ArrowLeft, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import { GlassContainer, GlassButton, MarkdownMath, ProgressRing } from '../ui';
import { CardsIcon, ErrorIcon } from '../icons';
import { useTaskList } from '../../hooks/useTaskList';
import { useFlashcards } from '../../hooks/useFlashcards';
import { useErrors } from '../../hooks/useErrors';
import { useFormulas } from '../../hooks/useFormulas';
import { useAuth } from '../../hooks/useAuth';
import { useGlassAngle } from '../../hooks/useGlassAngle';
import { THEMES } from '../../data/mockData';
import type { DashboardTabId, DashboardViewProps, Flashcard, FlashcardSection, ApiTask, Theme, UserError, UserFormula } from '../../types';

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

function getThemeForCategory(code: string): string {
  return code.charAt(0);
}

function parseSections(back: string): FlashcardSection[] {
  try {
    const parsed = JSON.parse(back);
    if (Array.isArray(parsed)) return parsed;
  } catch { /* not JSON */ }
  return [];
}

function CardReviewView({ card, cards, onBack, onNavigate, onNavigateToTask }: {
  card: Flashcard;
  cards: Flashcard[];
  onBack: () => void;
  onNavigate: (card: Flashcard) => void;
  onNavigateToTask: (taskId: number, category: string | null, tab?: number) => void;
}) {
  const { authFetch } = useAuth();
  const sections = parseSections(card.back);
  const [revealedCount, setRevealedCount] = useState(0);
  const [taskData, setTaskData] = useState<ApiTask | null>(null);

  const currentIndex = cards.findIndex(c => c.id === card.id);
  const canPrev = currentIndex > 0;
  const canNext = currentIndex < cards.length - 1;

  const goTo = useCallback((next: Flashcard) => {
    setRevealedCount(0);
    onNavigate(next);
  }, [onNavigate]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft' && canPrev) goTo(cards[currentIndex - 1]);
      if (e.key === 'ArrowRight' && canNext) goTo(cards[currentIndex + 1]);
      if (e.key === ' ') {
        e.preventDefault();
        setRevealedCount(prev => prev < sections.length ? prev + 1 : 0);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [canPrev, canNext, currentIndex, cards, sections.length, goTo]);

  useEffect(() => {
    if (!card.task_id) return;
    authFetch(`http://localhost:7863/api/tasks/${card.task_id}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data?.task) setTaskData(data.task); })
      .catch(() => {});
  }, [card.task_id, authFetch]);

  const givenItems = (() => {
    if (!taskData?.given_latex) return [];
    const clean = taskData.given_latex.replace(/^\s*Gegeben:\s*/i, '');
    return clean.match(/\$[^$]+\$/g) ?? [];
  })();

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
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => canPrev && goTo(cards[currentIndex - 1])}
            disabled={!canPrev}
            title="Vorherige Karte (←)"
            className="h-8 w-8 shrink-0 rounded-full flex items-center justify-center transition-all duration-300 neo-btn-nav active:scale-95"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            onClick={() => canNext && goTo(cards[currentIndex + 1])}
            disabled={!canNext}
            title="Nächste Karte (→)"
            className="h-8 w-8 shrink-0 rounded-full flex items-center justify-center transition-all duration-300 neo-btn-nav active:scale-95"
          >
            <ChevronRight size={15} />
          </button>
          {card.task_id && (
            <button
              onClick={() => onNavigateToTask(card.task_id!, null, 2)}
              className="text-label text-slate-500 hover:text-slate-700 transition-colors underline"
            >
              Zur Aufgabe
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3">
        {/* Front side — full task display */}
        <div className="bg-white/40 rounded-xl border border-white/60 p-4 text-body text-slate-700 space-y-2">
          <h3 className="text-heading font-semibold text-slate-800">
            {taskData?.title || card.front}
          </h3>
          {taskData?.description && (
            <p className="leading-snug">
              <MarkdownMath text={taskData.description} />
            </p>
          )}
          {givenItems.length > 0 && (
            <>
              <p className="font-medium text-slate-700">Gegeben:</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {givenItems.map((item, i) => (
                  <span key={i}><MarkdownMath text={item.trim()} /></span>
                ))}
              </div>
            </>
          )}
          {taskData?.image_url && (
            <div className="flex items-center justify-center pt-2">
              <img
                src={taskData.image_url}
                alt="Skizze zur Aufgabe"
                className="max-h-48 max-w-full object-contain rounded-lg"
                referrerPolicy="no-referrer"
              />
            </div>
          )}
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

export function DashboardView({ onNavigateToTask, onOpenSettings, getTaskCheckState, setTaskCheckState }: DashboardViewProps) {
  const [activeTab, setActiveTab] = useState<DashboardTabId>(
    () => (localStorage.getItem('dashboardTab') as DashboardTabId) || 'aufgaben'
  );
  const { tasks, loading: tasksLoading } = useTaskList();
  const { allCards, loadAllCards } = useFlashcards();
  const { allErrors, loadAllErrors } = useErrors();
  const { allFormulas, loadAllFormulas } = useFormulas();
  const [expandedThemes, setExpandedThemes] = useState<Set<string>>(new Set());
  const [collapsedSubs, setCollapsedSubs] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('collapsedSubs');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [reviewCard, setReviewCard] = useState<Flashcard | null>(null);
  const [reviewCardList, setReviewCardList] = useState<Flashcard[]>([]);

  const toggleSub = (code: string) => {
    setCollapsedSubs(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      localStorage.setItem('collapsedSubs', JSON.stringify([...next]));
      return next;
    });
  };

  useEffect(() => {
    if (activeTab === 'karten') loadAllCards();
    if (activeTab === 'fehler') loadAllErrors();
    if (activeTab === 'formeln') loadAllFormulas();
  }, [activeTab, loadAllCards, loadAllErrors, loadAllFormulas]);

  const cycleCheckState = (e: ReactMouseEvent, taskId: number) => {
    e.stopPropagation();
    const current = getTaskCheckState(taskId);
    const next = current === 'none' ? 'green' : current === 'green' ? 'yellow' : 'none';
    setTaskCheckState(taskId, next);
  };

  const checkBtnClass = (state: 'none' | 'green' | 'yellow') =>
    state === 'green'
      ? 'neo-btn-green'
      : state === 'yellow'
      ? 'neo-btn-yellow'
      : 'hover-neo-btn-green text-slate-400';

  const subDoneTotal = (code: string) => {
    const subTasks = tasksByCategory(code);
    const done = subTasks.filter(t => getTaskCheckState(t.id) !== 'none').length;
    return { done, total: subTasks.length };
  };

  const subProgress = (code: string) => {
    const { done, total } = subDoneTotal(code);
    if (total === 0) return 0;
    return Math.round((done / total) * 100);
  };

  const themeDoneTotal = (theme: Theme) => {
    const all = theme.kategorien.flatMap(k => tasksByCategory(k.code));
    const done = all.filter(t => getTaskCheckState(t.id) !== 'none').length;
    return { done, total: all.length };
  };

  const themeProgressPct = (theme: Theme) => {
    const { done, total } = themeDoneTotal(theme);
    if (total === 0) return 0;
    return Math.round((done / total) * 100);
  };

  const toggleTheme = (id: string) => {
    setExpandedThemes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const tasksByCategory = (code: string) =>
    tasks.filter(t => t.category === code);

  const taskCountForTheme = (theme: Theme) =>
    theme.kategorien.reduce((sum, k) => sum + tasksByCategory(k.code).length, 0);

  const errorsByTheme = (themeId: string) =>
    allErrors.filter(e => {
      if (!e.task_id) return false;
      const task = tasks.find(t => t.id === e.task_id);
      return task && getThemeForCategory(task.category) === themeId;
    });

  const formulasByTheme = (themeId: string) =>
    allFormulas.filter((f: UserFormula) => {
      if (!f.task_id) return false;
      const task = tasks.find(t => t.id === f.task_id);
      return task && getThemeForCategory(task.category) === themeId;
    });

  const cardsByTheme = (themeId: string) =>
    allCards.filter(c => {
      if (!c.task_id) return false;
      const task = tasks.find(t => t.id === c.task_id);
      if (!task || getThemeForCategory(task.category) !== themeId) return false;
      const secs = parseSections(c.back);
      return secs.some(s => s.content.trim().length > 0);
    });

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
              onClick={() => { setActiveTab(tab.id); localStorage.setItem('dashboardTab', tab.id); }}
              className={`relative h-10 px-4 rounded-full text-left text-heading font-medium flex items-center transition-colors duration-300 ${
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
          selectedTheme ? (
            /* ── Detail view: subcategories + tasks ── */
            <div className="flex-1 flex flex-col min-h-0">
              <div className="shrink-0 px-2 pt-[13px] pb-3 flex items-center gap-3">
                <GlassContainer className="h-10 w-10 justify-center">
                  <GlassButton onClick={() => setSelectedTheme(null)} className="active:scale-95" title="Zurück">
                    <ArrowLeft size={16} />
                  </GlassButton>
                </GlassContainer>
                <h2 className="text-xl font-semibold text-slate-800">{selectedTheme.titel}</h2>
              </div>
              <div className="flex-1 overflow-y-auto space-y-5 px-2 pb-8">
                {selectedTheme.kategorien.map((sub) => {
                  const subTasks = tasksByCategory(sub.code);
                  return (
                    <div key={sub.code}>
                      <button
                        onClick={() => toggleSub(sub.code)}
                        className="w-full flex items-center gap-2 mb-2 px-1 cursor-pointer"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <ChevronDown
                            size={16}
                            className={`text-slate-400 shrink-0 transition-transform duration-200 ${collapsedSubs.has(sub.code) ? '-rotate-90' : ''}`}
                          />
                          <span className="text-title font-medium text-slate-700 truncate">{sub.titel}</span>
                        </div>
                        {(() => {
                          const { done, total } = subDoneTotal(sub.code);
                          const pct = total === 0 ? 0 : Math.round((done / total) * 100);
                          return (
                            <div className="shrink-0 flex items-center justify-center overflow-visible" style={{ width: 52, height: 52 }}>
                              <div className="relative" style={{ transform: 'scale(0.56)' }}>
                                <ProgressRing progress={pct} />
                                <span className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ fontSize: '18px', fontWeight: 600, color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
                                  {done}/{total}
                                </span>
                              </div>
                            </div>
                          );
                        })()}
                      </button>
                      {!collapsedSubs.has(sub.code) && (
                        <div className="space-y-1">
                          {subTasks.map((task) => {
                            const state = getTaskCheckState(task.id);
                            return (
                            <div
                              key={task.id}
                              onClick={() => onNavigateToTask(task.id, sub.code)}
                              className="bg-white/40 rounded-xl border border-white/60 px-3 h-10 cursor-pointer hover:bg-white/60 hover:shadow-sm transition-all duration-200 flex items-center gap-2"
                            >
                              <span className="text-body text-slate-700 truncate flex-1">{task.title}</span>
                              <button
                                onClick={(e) => cycleCheckState(e, task.id)}
                                title={state === 'none' ? 'Als erledigt markieren' : state === 'green' ? 'Korrekt gelöst' : 'Teilweise bearbeitet'}
                                className={`h-6 w-6 shrink-0 rounded-full flex items-center justify-center transition-all duration-300 active:scale-95 ${checkBtnClass(state)}`}
                              >
                                <Check size={12} strokeWidth={2.5} />
                              </button>
                              <ChevronRight size={14} className="text-slate-300 shrink-0" />
                            </div>
                          );})}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* ── Theme list ── */
            <div className="flex-1 overflow-y-auto space-y-3 px-2 pb-8 pt-2">
              {tasksLoading ? (
                <div className="glass-panel-soft panel-radius p-6 flex items-center justify-center min-h-[200px]">
                  <span className="text-body text-slate-400">Laden...</span>
                </div>
              ) : (
                THEMES.map((theme) => {
                  const count = taskCountForTheme(theme);
                  return (
                    <div
                      key={theme.id}
                      onClick={() => setSelectedTheme(theme)}
                      className="glass-panel-soft panel-radius p-5 flex items-center gap-4 cursor-pointer hover:bg-white/80 transition-all duration-300 border border-white/60 hover:shadow-md group"
                    >
                      <div className="flex-1 min-w-0">
                        <h3 className="text-heading font-medium text-slate-800 group-hover:text-slate-900 transition-colors">
                          {theme.titel}
                        </h3>
                        <p className="text-body text-slate-500 mt-1">
                          {count} {count === 1 ? 'Aufgabe' : 'Aufgaben'}
                        </p>
                      </div>
                      {(() => {
                        const { done, total } = themeDoneTotal(theme);
                        const pct = total === 0 ? 0 : Math.round((done / total) * 100);
                        return (
                          <ProgressRing progress={pct} className="shrink-0">
                            <span className="text-label font-semibold text-slate-600 tabular-nums">
                              {done}/{total}
                            </span>
                          </ProgressRing>
                        );
                      })()}
                      <ChevronRight size={18} className="text-slate-300 group-hover:text-slate-400 transition-colors shrink-0" />
                    </div>
                  );
                })
              )}
            </div>
          )
        )}

        {activeTab === 'formeln' && (
          <div className="flex-1 overflow-y-auto space-y-3 px-2 pb-8 pt-2">
            {allFormulas.length === 0 ? (
              <div className="glass-panel-soft panel-radius p-6 flex items-center justify-center min-h-[200px]">
                <div className="text-center text-slate-500">
                  <p className="text-title font-medium">Noch keine Formeln</p>
                  <p className="text-body mt-2">Öffne eine Aufgabe und nutze den Formeln-Tab, um Formeln zu notieren.</p>
                </div>
              </div>
            ) : (
              THEMES.map((theme) => {
                const themeFormulas = formulasByTheme(theme.id);
                if (themeFormulas.length === 0) return null;
                const isExpanded = expandedThemes.has(`form-${theme.id}`);
                return (
                  <div key={theme.id} className="glass-panel-soft panel-radius border border-white/60 overflow-hidden">
                    <button
                      onClick={() => toggleTheme(`form-${theme.id}`)}
                      className="w-full p-4 flex items-center justify-between hover:bg-white/40 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <ChevronDown
                          size={16}
                          className={`text-slate-400 transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'}`}
                        />
                        <span className="text-heading font-medium text-slate-800">{theme.titel}</span>
                      </div>
                      <span className="text-label text-slate-400">
                        {themeFormulas.length} {themeFormulas.length === 1 ? 'Formel' : 'Formeln'}
                      </span>
                    </button>
                    {isExpanded && (() => {
                      const taskGroups: { taskId: number; task: typeof tasks[0] | undefined; formulas: typeof themeFormulas }[] = [];
                      themeFormulas.forEach((f: UserFormula) => {
                        const existing = taskGroups.find(g => g.taskId === f.task_id);
                        if (existing) {
                          existing.formulas.push(f);
                        } else {
                          taskGroups.push({ taskId: f.task_id!, task: tasks.find(t => t.id === f.task_id), formulas: [f] });
                        }
                      });
                      return (
                        <div className="border-t border-white/60">
                          {taskGroups.map((group, groupIdx) => (
                            <div
                              key={group.taskId}
                              className={groupIdx > 0 ? 'border-t border-white/60' : ''}
                            >
                              <button
                                onClick={() => group.taskId ? onNavigateToTask(group.taskId, group.task?.category ?? null, 4) : undefined}
                                className="w-full text-left px-4 py-3 hover:bg-white/40 transition-colors"
                              >
                                <span className="text-heading font-semibold text-slate-800">
                                  {group.task?.title ?? `Aufgabe ${group.taskId}`}
                                </span>
                              </button>
                              <div className="px-4 pb-4 space-y-3">
                                {group.formulas.map((f: UserFormula, fIdx: number) => (
                                  <div key={f.id}>
                                    {group.formulas.length > 1 && (
                                      <p className="text-label font-medium text-slate-600 mb-1">Formel {fIdx + 1}</p>
                                    )}
                                    {f.note && (
                                      <div className="text-body text-slate-700 markdown-body">
                                        <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>
                                          {f.note}
                                        </ReactMarkdown>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'fehler' && (
          <div className="flex-1 overflow-y-auto space-y-3 px-2 pb-8 pt-2">
            {allErrors.length === 0 ? (
              <div className="glass-panel-soft panel-radius p-6 flex items-center justify-center min-h-[200px]">
                <div className="text-center text-slate-500">
                  <ErrorIcon className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <p className="text-title font-medium">Noch keine Fehler</p>
                  <p className="text-body mt-2">Öffne eine Aufgabe und nutze den Fehler-Tab, um Fehler zu notieren.</p>
                </div>
              </div>
            ) : (
              THEMES.map((theme) => {
                const themeErrors = errorsByTheme(theme.id);
                if (themeErrors.length === 0) return null;
                const isExpanded = expandedThemes.has(`err-${theme.id}`);
                return (
                  <div key={theme.id} className="glass-panel-soft panel-radius border border-white/60 overflow-hidden">
                    <button
                      onClick={() => toggleTheme(`err-${theme.id}`)}
                      className="w-full p-4 flex items-center justify-between hover:bg-white/40 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <ChevronDown
                          size={16}
                          className={`text-slate-400 transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'}`}
                        />
                        <span className="text-heading font-medium text-slate-800">{theme.titel}</span>
                      </div>
                      <span className="text-label text-slate-400">
                        {themeErrors.length} {themeErrors.length === 1 ? 'Fehler' : 'Fehler'}
                      </span>
                    </button>
                    {isExpanded && (() => {
                      // Group errors by task_id
                      const taskGroups: { taskId: number; task: typeof tasks[0] | undefined; errors: typeof themeErrors }[] = [];
                      themeErrors.forEach(err => {
                        const existing = taskGroups.find(g => g.taskId === err.task_id);
                        if (existing) {
                          existing.errors.push(err);
                        } else {
                          taskGroups.push({ taskId: err.task_id!, task: tasks.find(t => t.id === err.task_id), errors: [err] });
                        }
                      });
                      return (
                        <div className="border-t border-white/60">
                          {taskGroups.map((group, groupIdx) => (
                            <div
                              key={group.taskId}
                              className={groupIdx > 0 ? 'border-t border-white/60' : ''}
                            >
                              <button
                                onClick={() => group.taskId ? onNavigateToTask(group.taskId, group.task?.category ?? null, 3) : undefined}
                                className="w-full text-left px-4 py-3 hover:bg-white/40 transition-colors"
                              >
                                <span className="text-heading font-semibold text-slate-800">
                                  {group.task?.title ?? `Aufgabe ${group.taskId}`}
                                </span>
                              </button>
                              <div className="px-4 pb-4 space-y-3">
                                {group.errors.map((err, errIdx) => (
                                  <div key={err.id}>
                                    {group.errors.length > 1 && (
                                      <p className="text-label font-medium text-slate-600 mb-1">Fehler {errIdx + 1}</p>
                                    )}
                                    {err.note && (
                                      <div className="text-body text-slate-700 markdown-body">
                                        <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>
                                          {err.note}
                                        </ReactMarkdown>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'karten' && (
          reviewCard ? (
            <CardReviewView
              card={reviewCard}
              cards={reviewCardList}
              onBack={() => setReviewCard(null)}
              onNavigate={setReviewCard}
              onNavigateToTask={onNavigateToTask}
            />
          ) : (
            <div className="flex-1 overflow-y-auto space-y-3 px-2 pb-8 pt-2">
              {allCards.filter(c => { const s = parseSections(c.back); return s.some(x => x.content.trim().length > 0); }).length === 0 ? (
                <div className="glass-panel-soft panel-radius p-6 flex items-center justify-center min-h-[200px]">
                  <div className="text-center text-slate-500">
                    <CardsIcon className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                    <p className="text-title font-medium">Noch keine Karteikarten</p>
                    <p className="text-body mt-2">Öffne eine Aufgabe und nutze den Karten-Tab, um Lösungsansätze zu schreiben.</p>
                  </div>
                </div>
              ) : (
                THEMES.map((theme) => {
                  const cards = cardsByTheme(theme.id);
                  const isExpanded = expandedThemes.has(theme.id);
                  return (
                    <div key={theme.id} className="glass-panel-soft panel-radius border border-white/60 overflow-hidden">
                      <button
                        onClick={() => toggleTheme(theme.id)}
                        className="w-full p-4 flex items-center justify-between hover:bg-white/40 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <ChevronDown
                            size={16}
                            className={`text-slate-400 transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'}`}
                          />
                          <span className="text-heading font-medium text-slate-800">{theme.titel}</span>
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
                                onClick={() => { setReviewCard(card); setReviewCardList(cards); }}
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
