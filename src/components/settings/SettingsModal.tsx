import { useState } from 'react';
import { X, Eye, EyeOff, Save, Check, User, LogOut } from 'lucide-react';
import { GlassButton, GlassContainer } from '../ui';
import type { SettingsModalProps } from '../../types';

type Tab = 'api' | 'account';

export function SettingsModal({ isOpen, onClose, geminiKey, onSaveGemini, username, onLogout }: SettingsModalProps) {
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
            className={`flex-1 py-2 text-sm font-medium transition-all duration-200 ${tab === 'api' ? 'bg-white/80 text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            API Key
          </button>
          {username && (
            <button
              onClick={() => setTab('account')}
              className={`flex-1 py-2 text-sm font-medium transition-all duration-200 ${tab === 'account' ? 'bg-white/80 text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
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
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-200/60 bg-red-50/60 text-sm font-medium text-red-600 hover:bg-red-100/70 transition-colors"
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
