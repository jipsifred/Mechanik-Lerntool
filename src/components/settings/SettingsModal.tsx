import { useState } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
import { GlassButton, GlassContainer } from '../ui';
import type { SettingsModalProps } from '../../types';

interface KeyFieldProps {
  label: string;
  hint: string;
  placeholder: string;
  initialValue: string;
  onSave: (key: string) => void;
}

function KeyField({ label, hint, placeholder, initialValue, onSave }: KeyFieldProps) {
  const [value, setValue] = useState(initialValue);
  const [show, setShow]   = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSave(value.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-1.5">
      <label className="text-[13px] font-medium text-slate-700 block">{label}</label>
      <div className="flex gap-2">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => { setValue(e.target.value); setSaved(false); }}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          placeholder={placeholder}
          className="flex-1 h-9 px-3 text-[13px] text-slate-700 bg-white/60 border border-slate-300/70 rounded-xl focus:outline-none focus:border-slate-400 focus:bg-white transition-colors placeholder:text-slate-400"
        />
        <GlassContainer className="h-9 w-9 justify-center shrink-0">
          <GlassButton onClick={() => setShow((v) => !v)} title={show ? 'Verbergen' : 'Anzeigen'}>
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </GlassButton>
        </GlassContainer>
        <button
          onClick={handleSave}
          className={`h-9 px-3 rounded-xl text-[13px] font-medium transition-all duration-200 active:scale-[0.98] shrink-0 ${
            saved ? 'bg-green-100 text-green-700 border border-green-300' : 'neo-btn-green'
          }`}
        >
          {saved ? '✓' : 'Speichern'}
        </button>
      </div>
      <p className="text-[11px] text-slate-400 leading-snug">{hint}</p>
    </div>
  );
}

export function SettingsModal({ isOpen, onClose, geminiKey, groqKey, onSaveGemini, onSaveGroq }: SettingsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />

      <div className="relative glass-panel-soft rounded-2xl p-6 w-[460px] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-slate-800">Einstellungen</h2>
          <GlassContainer className="h-7 w-7 justify-center">
            <GlassButton onClick={onClose} title="Schließen" className="h-6 w-6">
              <X size={14} />
            </GlassButton>
          </GlassContainer>
        </div>

        <div className="space-y-5">
          {/* Groq section */}
          <div className="bg-green-50/60 border border-green-200/60 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-green-700 bg-green-100 px-2 py-0.5 rounded-full">Kostenlos</span>
              <span className="text-[13px] font-semibold text-slate-700">Groq</span>
            </div>
            <KeyField
              label="Groq API Key"
              hint="Kostenloser Key auf console.groq.com · Llama 3.3 70B, Gemma 2 u.a. · Keine Kreditkarte nötig"
              placeholder="gsk_..."
              initialValue={groqKey}
              onSave={onSaveGroq}
            />
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-200/70" />
            <span className="text-[11px] text-slate-400">oder</span>
            <div className="flex-1 h-px bg-slate-200/70" />
          </div>

          {/* Gemini section */}
          <KeyField
            label="Google Gemini API Key"
            hint="Key auf aistudio.google.com · Kostenpflichtige Nutzung (Billing erforderlich)"
            placeholder="AIza..."
            initialValue={geminiKey}
            onSave={onSaveGemini}
          />

          <p className="text-[11px] text-slate-400 leading-snug">
            Alle Keys werden ausschließlich lokal in deinem Browser gespeichert und niemals an unsere Server übertragen.
          </p>
        </div>
      </div>
    </div>
  );
}
