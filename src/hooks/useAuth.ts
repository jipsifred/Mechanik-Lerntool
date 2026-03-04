import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import type { User, AuthState, LoginCredentials, RegisterCredentials } from '../types';

interface UseAuthReturn extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

export function useAuth(): UseAuthReturn {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
