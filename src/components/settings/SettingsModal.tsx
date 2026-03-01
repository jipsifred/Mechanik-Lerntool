import { useState } from 'react';
import { X, Eye, EyeOff, Save, Check } from 'lucide-react';
import { GlassButton, GlassContainer } from '../ui';
import type { SettingsModalProps } from '../../types';

export function SettingsModal({ isOpen, onClose, geminiKey, onSaveGemini }: SettingsModalProps) {
  const [value, setValue] = useState(geminiKey);
  const [show, setShow]   = useState(false);
  const [saved, setSaved] = useState(false);

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
      </div>
    </div>
  );
}
