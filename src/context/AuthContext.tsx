import { createContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { User, AuthState, LoginCredentials, RegisterCredentials } from '../types';

const API_BASE = 'http://localhost:7863';

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

  // Try to restore session via refresh token cookie on mount
  useEffect(() => {
    refreshSession().finally(() => setIsLoading(false));
  }, []);

  async function refreshSession(): Promise<string | null> {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) return null;
      const data = await res.json();
      setAccessToken(data.accessToken);
      setUser(data.user);
      return data.accessToken;
    } catch {
      return null;
    }
  }

  const authFetch = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      let token = accessToken;

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
        } else {
          setUser(null);
          setAccessToken(null);
        }
      }

      return res;
    },
    [accessToken]
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
    setAccessToken(data.accessToken);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    }).catch(() => {});
    setUser(null);
    setAccessToken(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, accessToken, isLoading, login, register, logout, authFetch }}>
      {children}
    </AuthContext.Provider>
  );
}
