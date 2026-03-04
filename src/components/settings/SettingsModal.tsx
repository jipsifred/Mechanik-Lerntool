import { useState } from 'react';
import { X, Eye, EyeOff, Save, Check, User, LogOut, Moon, Sun } from 'lucide-react';
import { GlassButton, GlassContainer } from '../ui';
import type { SettingsModalProps } from '../../types';

type Tab = 'api' | 'account' | 'appearance';

export function SettingsModal({ isOpen, onClose, geminiKey, onSaveGemini, username, onLogout, darkMode, onToggleDarkMode }: SettingsModalProps) {
  const [value, setValue] = useState(geminiKey);
  const [show, setShow]   = useState(false);
  const [saved, setSaved] = useState(false);
  const [tab, setTab]     = useState<Tab>('api');

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveGemini(value.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />

      <div className="relative glass-panel-soft panel-radius p-6 w-[420px] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-heading font-semibold text-slate-800">Einstellungen</h2>
          <GlassContainer className="h-10 w-10 justify-center">
            <GlassButton onClick={onClose} title="Schließen">
              <X size={14} />
            </GlassButton>
          </GlassContainer>
        </div>

        {/* Tabs */}
        <div className="flex rounded-xl overflow-hidden border border-slate-200/60 bg-white/30 mb-5">
          <button
            onClick={() => setTab('api')}
            className={`tab-btn ${tab === 'api' ? 'tab-btn-active' : ''}`}
          >
            API Key
          </button>
          <button
            onClick={() => setTab('appearance')}
            className={`tab-btn ${tab === 'appearance' ? 'tab-btn-active' : ''}`}
          >
            Erscheinungsbild
          </button>
          {username && (
            <button
              onClick={() => setTab('account')}
              className={`tab-btn ${tab === 'account' ? 'tab-btn-active' : ''}`}
            >
              Account
            </button>
          )}
        </div>

        {tab === 'api' && (
          <div className="space-y-4">
            <label className="text-body font-medium text-slate-700 block">Google Gemini API Key</label>
            <GlassContainer className="h-10 w-full gap-1">
              <input
                type={show ? 'text' : 'password'}
                value={value}
                onChange={(e) => { setValue(e.target.value); setSaved(false); }}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                placeholder="AIza..."
                className="flex-1 bg-transparent border-none px-3 text-body text-slate-700 focus:outline-none placeholder:text-slate-400"
              />
              <GlassButton onClick={() => setShow(v => !v)} title={show ? 'Verbergen' : 'Anzeigen'}>
                {show ? <EyeOff size={14} /> : <Eye size={14} />}
              </GlassButton>
              <GlassButton onClick={handleSave} title="Speichern" className={`active:scale-95 ${saved ? 'text-green-600' : ''}`}>
                {saved ? <Check size={14} /> : <Save size={14} />}
              </GlassButton>
            </GlassContainer>
            <p className="text-hint text-slate-400 leading-snug">
              Key kostenlos auf <strong>aistudio.google.com</strong> · Wird nur lokal in deinem Browser gespeichert.
            </p>
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
              {/* Pill toggle */}
              <div className={`relative w-10 h-5 rounded-full transition-colors duration-300 shrink-0 ${darkMode ? 'bg-[var(--neo-green-base)]' : 'bg-slate-200'}`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300 ${darkMode ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
            </button>
          </div>
        )}

        {tab === 'account' && username && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/40 border border-slate-200/60">
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                <User size={15} className="text-slate-500" />
              </div>
              <div className="min-w-0">
                <p className="text-body font-medium text-slate-800 truncate">{username}</p>
                <p className="text-hint text-slate-400">Eingeloggt</p>
              </div>
            </div>
            <button
              onClick={() => { onLogout?.(); onClose(); }}
              className="neo-btn-red rounded-full w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-all duration-300 active:scale-95"
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
