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
    <div className="h-screen w-screen overflow-hidden flex bg-[#fafafa]" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* Left — Form */}
      <div className="flex-1 flex flex-col justify-between p-12 md:p-16 lg:p-20">
        {/* Top — Brand mark */}
        <div>
          <span className="text-xs tracking-[0.25em] uppercase text-neutral-400 font-medium" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Mechanik Lerntool
          </span>
        </div>

        {/* Center — Form content */}
        <div className="w-full max-w-[360px]">
          <h1
            className="text-[clamp(2rem,4vw,3.2rem)] font-bold leading-[1.05] tracking-[-0.03em] text-neutral-900 mb-3"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {tab === 'login' ? 'Willkommen\nzurück.' : 'Account\nerstellen.'}
          </h1>
          <p className="text-sm text-neutral-400 font-light mb-12 leading-relaxed">
            {tab === 'login'
              ? 'Melde dich an, um deinen Fortschritt zu speichern.'
              : 'Registriere dich, um mit dem Lernen zu beginnen.'}
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] tracking-[0.08em] uppercase text-neutral-400 font-medium">E-Mail</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-0 py-3 bg-transparent border-b border-neutral-200 text-sm text-neutral-900 placeholder-neutral-300 outline-none focus:border-neutral-900 transition-colors duration-300"
                placeholder="name@beispiel.de"
              />
            </div>
            {tab === 'register' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] tracking-[0.08em] uppercase text-neutral-400 font-medium">Benutzername</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                  minLength={2}
                  className="w-full px-0 py-3 bg-transparent border-b border-neutral-200 text-sm text-neutral-900 placeholder-neutral-300 outline-none focus:border-neutral-900 transition-colors duration-300"
                  placeholder="Dein Name"
                />
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] tracking-[0.08em] uppercase text-neutral-400 font-medium">Passwort</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-0 py-3 bg-transparent border-b border-neutral-200 text-sm text-neutral-900 placeholder-neutral-300 outline-none focus:border-neutral-900 transition-colors duration-300"
                placeholder="Min. 6 Zeichen"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 mt-1">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="neo-btn-gray-light rounded-full w-full mt-8 py-3.5 text-sm font-medium tracking-wide transition-all duration-300 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? 'Bitte warten...' : tab === 'login' ? 'Anmelden' : 'Registrieren'}
            </button>
          </form>
        </div>

        {/* Bottom — Switch link */}
        <div>
          <p className="text-sm text-neutral-400 font-light">
            {tab === 'login' ? (
              <>Noch kein Konto? <button type="button" onClick={() => { setTab('register'); setError(''); }} className="text-neutral-900 font-medium hover:underline underline-offset-4">Registrieren</button></>
            ) : (
              <>Bereits registriert? <button type="button" onClick={() => { setTab('login'); setError(''); }} className="text-neutral-900 font-medium hover:underline underline-offset-4">Anmelden</button></>
            )}
          </p>
        </div>
      </div>

      {/* Right — Brand panel */}
      <div
        className="hidden md:flex w-[48%] relative m-3 rounded-[2rem] overflow-hidden flex-col justify-end p-12 lg:p-16"
        style={{
          background: `
            radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.25) 0%, transparent 50%),
            radial-gradient(ellipse at 70% 60%, #34d399 0%, transparent 55%),
            radial-gradient(ellipse at 100% 90%, #059669 0%, transparent 50%),
            radial-gradient(ellipse at 0% 80%, #10b981 0%, transparent 45%),
            linear-gradient(160deg, #a7f3d0 0%, #34d399 25%, #059669 55%, #064e3b 100%)
          `,
        }}
      >
        {/* Noise texture */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.3] pointer-events-none mix-blend-overlay" xmlns="http://www.w3.org/2000/svg">
          <filter id="grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#grain)" />
        </svg>

        <div className="relative z-10" />
      </div>
    </div>
  );
}
