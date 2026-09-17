import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './useAuth';
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <p className="font-mono text-cyber">Restoring secure session…</p>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
