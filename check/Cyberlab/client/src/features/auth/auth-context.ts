import { createContext } from 'react';
import type { ApiUser } from '../../lib/api';

export interface AuthContextValue {
  user: ApiUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, confirmPassword: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
