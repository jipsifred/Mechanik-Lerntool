import { createContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import type { User, AuthState, LoginCredentials, RegisterCredentials } from '../types';

const API_BASE = '';

interface AuthContextValue extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // FIX 1: Ref keeps the latest token available immediately (no stale closure)
  const accessTokenRef = useRef<string | null>(null);
  useEffect(() => { accessTokenRef.current = accessToken; }, [accessToken]);

  // Mutex: only one refresh request in flight at a time
  const refreshPromiseRef = useRef<Promise<string | null> | null>(null);

  const refreshSession = useCallback((): Promise<string | null> => {
    // If a refresh is already in flight, share that promise
    if (refreshPromiseRef.current) return refreshPromiseRef.current;

    const promise = (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        if (!res.ok) return null;
        const data = await res.json();
        accessTokenRef.current = data.accessToken;
        setAccessToken(data.accessToken);
        setUser(data.user);
        return data.accessToken as string;
      } catch {
        return null;
      } finally {
        refreshPromiseRef.current = null;
      }
    })();

    refreshPromiseRef.current = promise;
    return promise;
  }, []);

  // Try to restore session via refresh token cookie on mount
  useEffect(() => {
    refreshSession().finally(() => setIsLoading(false));
  }, [refreshSession]);

  const authFetch = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      // FIX 1: Read from ref (always current) instead of stale closure
      let token = accessTokenRef.current;

      const doFetch = (t: string | null) =>
        fetch(url, {
          ...options,
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...(options.headers as Record<string, string> | undefined),
            ...(t ? { Authorization: `Bearer ${t}` } : {}),
          },
        });

      let res = await doFetch(token);

      // Token expired — try refresh once
      if (res.status === 401) {
        token = await refreshSession();
        if (token) {
          res = await doFetch(token);
        }
        // FIX 2: Do NOT force-logout here. If refresh failed it could be a
        // transient network issue. The next page load will check the session.
        // Only an explicit logout button should clear user state.
      }

      return res;
    },
    // FIX 1: No dependency on accessToken — ref keeps it stable
    [refreshSession]
  );

  const login = useCallback(async (credentials: LoginCredentials) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? 'Login failed');
    }
    const data = await res.json();
    accessTokenRef.current = data.accessToken;
    setAccessToken(data.accessToken);
    setUser(data.user);
  }, []);

  const register = useCallback(async (credentials: RegisterCredentials) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? 'Registration failed');
    }
    const data = await res.json();
    accessTokenRef.current = data.accessToken;
    setAccessToken(data.accessToken);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    }).catch(() => {});
    accessTokenRef.current = null;
    setUser(null);
    setAccessToken(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, accessToken, isLoading, login, register, logout, authFetch }}>
      {children}
    </AuthContext.Provider>
  );
}
