import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, type ApiUser } from '../../lib/api';
import { AuthContext, type AuthContextValue } from './auth-context';
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    api
      .me()
      .then(({ user: currentUser }) => setUser(currentUser))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);
  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      login: async (email, password) => {
        const result = await api.login({ email, password });
        setUser(result.user);
      },
      register: async (username, email, password, confirmPassword) => {
        await api.register({ username, email, password, confirmPassword });
      },
      logout: async () => {
        await api.logout();
        setUser(null);
      },
    }),
    [user, isLoading],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
