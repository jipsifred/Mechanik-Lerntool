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
    <div className="h-screen w-screen overflow-hidden bg-[#f8f8fa] flex items-center justify-center font-sans text-slate-800">
      <div className="glass-panel-soft panel-radius p-8 w-full max-w-sm flex flex-col gap-6">
        {/* Title */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800 mb-1">Mechanik Lerntool</h1>
          <p className="text-sm text-slate-500">Melde dich an, um deinen Fortschritt zu speichern.</p>
        </div>

        {/* Tab switcher */}
        <div className="flex rounded-xl overflow-hidden border border-slate-200/60 bg-white/30">
          {(['login', 'register'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(''); }}
              className={`tab-btn ${tab === t ? 'tab-btn-active' : ''}`}
            >
              {t === 'login' ? 'Anmelden' : 'Registrieren'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="E-Mail"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200/60 bg-white/50 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-slate-400 transition-colors"
          />
          {tab === 'register' && (
            <input
              type="text"
              placeholder="Benutzername"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              minLength={2}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200/60 bg-white/50 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-slate-400 transition-colors"
            />
          )}
          <input
            type="password"
            placeholder="Passwort"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200/60 bg-white/50 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-slate-400 transition-colors"
          />

          {error && (
            <p className="text-sm text-red-500 bg-red-50/80 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="neo-btn-green rounded-full w-full py-2.5 text-sm font-medium mt-1 transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Bitte warten…' : tab === 'login' ? 'Anmelden' : 'Account erstellen'}
          </button>
        </form>
      </div>
    </div>
  );
}
