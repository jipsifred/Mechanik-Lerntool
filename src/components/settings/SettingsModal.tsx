import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { motion } from 'motion/react';
import { X, Eye, EyeOff, Save, Check, User, LogOut, Moon, Sun, BookOpen } from 'lucide-react';
import { useGlassAngle } from '../../hooks/useGlassAngle';
import { GlassButton, GlassContainer } from '../ui';
import type { SettingsModalProps, AIPromptContext } from '../../types';

type Tab = 'api' | 'prompts' | 'appearance' | 'account';

const PROMPT_FIELDS: { context: AIPromptContext; label: string }[] = [
  { context: 'chat', label: 'Chat' },
  { context: 'karteikarten', label: 'Karteikarten' },
  { context: 'fehler', label: 'Fehler-Log' },
  { context: 'formeln', label: 'Formelsammlung' },
];

const TABS: { id: Tab; label: string }[] = [
  { id: 'api', label: 'API Key' },
  { id: 'prompts', label: 'KI-Prompts' },
  { id: 'appearance', label: 'Erscheinungsbild' },
  { id: 'account', label: 'Account' },
];

function ActiveTabIndicator() {
  const { ref, angle } = useGlassAngle();

  return (
    <div
      ref={ref}
      className="absolute inset-0 z-0 rounded-full dashboard-pill-shell"
      style={{ '--g-angle': `${angle}deg`, '--g-stop2': '35%', '--g-stop3': '65%' } as CSSProperties}
    />
  );
}

export function SettingsModal({
  isOpen,
  onClose,
  geminiKey,
  onSaveGemini,
  username,
  onLogout,
  darkMode,
  onToggleDarkMode,
  formulaChapterMode,
  onToggleFormulaChapterMode,
  customPrompts,
  onSaveCustomPrompt,
}: SettingsModalProps) {
  const [value, setValue] = useState(geminiKey);
  const [show, setShow] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<Tab>('api');
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setValue(geminiKey);
    setShow(false);
    setSaved(false);
  }, [isOpen, geminiKey]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (tab === 'account' && !username) {
      setTab('api');
    }
  }, [tab, username]);

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveGemini(value.trim());
    setSaved(true);

    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSaved(false), 2000);
  };

  const visibleTabs = username ? TABS : TABS.filter((item) => item.id !== 'account');
  const activeLabel = visibleTabs.find((item) => item.id === tab)?.label ?? 'Einstellungen';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-5xl h-[min(680px,calc(100vh-2rem))] flex flex-col md:flex-row gap-4">
          <aside className="w-full md:w-56 glass-panel-soft panel-radius p-3 flex flex-col gap-1.5 shrink-0">
            <div className="px-3 pt-2 pb-1">
              <h2 className="text-heading font-semibold text-slate-800">Einstellungen</h2>
            </div>

            {visibleTabs.map((item) => {
              const isActive = tab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  className={`relative h-10 px-4 rounded-full text-left text-heading font-medium flex items-center transition-colors duration-300 ${
                    isActive ? 'text-slate-800' : 'text-slate-600 hover:bg-white/50'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeSettingsTab"
                      className="absolute inset-0 z-0"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                    >
                      <ActiveTabIndicator />
                    </motion.div>
                  )}
                  <span className="relative z-10 truncate">{item.label}</span>
                </button>
              );
            })}
          </aside>

          <section className="flex-1 glass-panel-soft panel-radius p-5 sm:p-6 flex flex-col min-h-0">
            <div className="flex items-center justify-between gap-4 mb-5 shrink-0">
              <h3 className="text-title font-semibold text-slate-800">{activeLabel}</h3>
              <GlassContainer className="h-11 w-11 justify-center">
                <GlassButton onClick={onClose} title="Schließen">
                  <X size={14} />
                </GlassButton>
              </GlassContainer>
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
              {tab === 'api' && (
                <div className="space-y-4">
                  <label className="text-body font-medium text-slate-700 block">Google Gemini API Key</label>
                  <GlassContainer className="h-10 w-full gap-1">
                    <input
                      type={show ? 'text' : 'password'}
                      value={value}
                      onChange={(event) => {
                        setValue(event.target.value);
                        setSaved(false);
                      }}
                      onKeyDown={(event) => event.key === 'Enter' && handleSave()}
                      placeholder="AIza..."
                      className="flex-1 bg-transparent border-none px-3 text-body text-slate-700 focus:outline-none placeholder:text-slate-400"
                    />
                    <GlassButton onClick={() => setShow((current) => !current)} title={show ? 'Verbergen' : 'Anzeigen'}>
                      {show ? <EyeOff size={14} /> : <Eye size={14} />}
                    </GlassButton>
                    <GlassButton onClick={handleSave} title="Speichern" className={`active:scale-95 ${saved ? 'text-green-600' : ''}`}>
                      {saved ? <Check size={14} /> : <Save size={14} />}
                    </GlassButton>
                  </GlassContainer>
                  <p className="text-hint text-slate-400">Lokal gespeichert.</p>
                </div>
              )}

              {tab === 'prompts' && (
                <div className="space-y-4">
                  {PROMPT_FIELDS.map(({ context, label }) => (
                    <div key={context} className="space-y-1.5">
                      <label className="text-body font-medium text-slate-700 block">{label}</label>
                      <textarea
                        value={customPrompts[context]}
                        onChange={(event) => onSaveCustomPrompt(context, event.target.value)}
                        placeholder="Eigener Prompt..."
                        rows={4}
                        className="w-full glass-panel-inner rounded-xl px-3 py-2 text-body text-slate-700 focus:outline-none placeholder:text-slate-400 resize-y min-h-[104px]"
                      />
                    </div>
                  ))}
                </div>
              )}

              {tab === 'appearance' && (
                <div className="space-y-3">
                  <button
                    onClick={onToggleDarkMode}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl glass-panel-inner text-left transition-all duration-200 active:scale-[0.99]"
                  >
                    <div className="shrink-0 text-slate-500">
                      {darkMode ? <Moon size={18} /> : <Sun size={18} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-body font-medium text-slate-800">Dunkles Design</p>
                    </div>
                    <div className={`relative w-10 h-5 rounded-full transition-colors duration-300 shrink-0 ${darkMode ? 'bg-[var(--neo-green-base)]' : 'bg-slate-200'}`}>
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300 ${darkMode ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </div>
                  </button>
                  <button
                    onClick={onToggleFormulaChapterMode}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl glass-panel-inner text-left transition-all duration-200 active:scale-[0.99]"
                  >
                    <div className="shrink-0 text-slate-500">
                      <BookOpen size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-body font-medium text-slate-800">Formelsammlung pro Kapitel</p>
                      <p className="text-hint text-slate-400">Statt pro Aufgabe</p>
                    </div>
                    <div className={`relative w-10 h-5 rounded-full transition-colors duration-300 shrink-0 ${formulaChapterMode ? 'bg-[var(--neo-green-base)]' : 'bg-slate-200'}`}>
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300 ${formulaChapterMode ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </div>
                  </button>
                </div>
              )}

              {tab === 'account' && username && (
                <div className="space-y-4">
                  <div className="glass-panel-inner rounded-xl px-4 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                      <User size={15} className="text-slate-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-body font-medium text-slate-800 truncate">{username}</p>
                      <p className="text-hint text-slate-400">Eingeloggt</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      onLogout?.();
                      onClose();
                    }}
                    className="neo-btn-red rounded-full w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-all duration-300 active:scale-95"
                  >
                    <LogOut size={14} />
                    Abmelden
                  </button>
                </div>
              )}
            </div>
          </section>
      </div>
    </div>
  );
}
