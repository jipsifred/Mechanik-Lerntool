import { useState, type FormEvent } from 'react';
import { useAuth } from '../../hooks/useAuth';

type Tab = 'login' | 'register';

export function LoginScreen() {
  const { login, register } = useAuth();
  const [tab, setTab] = useState<Tab>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (tab === 'login') {
        await login({ email, password });
      } else {
        await register({ email, username, password });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="h-screen w-screen overflow-hidden flex items-center justify-center font-sans text-slate-800 relative"
      style={{
        background: `
          radial-gradient(ellipse at 50% 45%, rgba(255,255,255,0.35) 0%, transparent 45%),
          radial-gradient(ellipse at 20% 0%, #a0f0b8 0%, transparent 50%),
          radial-gradient(ellipse at 60% 50%, #34d399 0%, transparent 50%),
          radial-gradient(ellipse at 100% 80%, #059669 0%, transparent 50%),
          radial-gradient(ellipse at 30% 90%, #10b981 0%, transparent 45%),
          radial-gradient(ellipse at 0% 60%, #6ee7a0 0%, transparent 40%),
          linear-gradient(145deg, #bbf7d0 0%, #34d399 30%, #059669 65%, #065f46 100%)
        `,
      }}
    >
      {/* Noise texture overlay */}
      <svg className="absolute inset-0 w-full h-full opacity-35 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
      <div className="panel-radius p-8 w-full max-w-sm flex flex-col gap-6 relative z-10" style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.25)', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
        {/* Title */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800 mb-1">Mechanik Lerntool</h1>
          <p className="text-sm text-slate-500">{tab === 'login' ? 'Melde dich an, um deinen Fortschritt zu speichern.' : 'Erstelle einen Account, um loszulegen.'}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="E-Mail"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="glass-panel-inner panel-radius w-full px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-slate-400 transition-colors"
          />
          {tab === 'register' && (
            <input
              type="text"
              placeholder="Benutzername"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              minLength={2}
              className="glass-panel-inner panel-radius w-full px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-slate-400 transition-colors"
            />
          )}
          <input
            type="password"
            placeholder="Passwort"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
            className="glass-panel-inner panel-radius w-full px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-slate-400 transition-colors"
          />

          {error && (
            <p className="text-sm text-red-500 bg-red-50/80 panel-radius px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="neo-btn-green-vivid rounded-full w-full py-2.5 text-sm font-medium mt-4 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Bitte warten...' : tab === 'login' ? 'Anmelden' : 'Account erstellen'}
          </button>
        </form>

        {/* Switch link */}
        <p className="text-center text-sm text-white/70 -mt-4 -mb-4">
          {tab === 'login' ? (
            <>Noch kein Konto? <button type="button" onClick={() => { setTab('register'); setError(''); }} className="text-white font-medium hover:underline">Registrieren</button></>
          ) : (
            <>Bereits registriert? <button type="button" onClick={() => { setTab('login'); setError(''); }} className="text-white font-medium hover:underline">Anmelden</button></>
          )}
        </p>
      </div>
    </div>
  );
}
