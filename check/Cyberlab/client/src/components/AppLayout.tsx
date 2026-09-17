import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/useAuth';

interface AppLayoutProps {
  children: ReactNode;
}

const links = [
  { to: '/', label: 'Home' },
  { to: '/challenges', label: 'Challenges' },
  { to: '/labs', label: 'Labs' },
  { to: '/dashboard', label: 'Dashboard' },
];

export function AppLayout({ children }: AppLayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  return (
    <div className="min-h-screen bg-ink text-slate-100 selection:bg-cyber/30">
      <header className="border-b border-cyan-950/80 bg-ink/90 backdrop-blur">
        <nav
          className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4"
          aria-label="Main navigation"
        >
          <NavLink
            to="/"
            aria-label="CyberLab home"
            className="flex items-center gap-3 font-semibold tracking-tight text-white"
          >
            <span className="grid h-9 w-9 place-items-center rounded-lg border border-cyber/60 bg-cyber/10 font-mono text-lg text-cyber">
              &gt;_
            </span>
            <span>
              Cyber<span className="text-cyber">Lab</span>
            </span>
          </NavLink>
          <div className="flex items-center gap-1 text-sm">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `rounded-md px-3 py-2 transition ${isActive ? 'bg-cyan-950/70 text-cyber' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`
                }
              >
                {link.label}
              </NavLink>
            ))}
            {user ? (
              <button
                type="button"
                onClick={handleLogout}
                className="ml-2 rounded-md border border-cyber/50 px-3 py-2 font-medium text-cyber transition hover:bg-cyber hover:text-ink"
              >
                Logout
              </button>
            ) : (
              <NavLink
                to="/login"
                className="ml-2 rounded-md border border-cyber/50 px-3 py-2 font-medium text-cyber transition hover:bg-cyber hover:text-ink"
              >
                Login
              </NavLink>
            )}
          </div>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl px-6 py-12">{children}</main>
      <footer className="mx-auto max-w-6xl border-t border-slate-800 px-6 py-6 text-xs text-slate-500">
        CyberLab · local-only web security education
      </footer>
    </div>
  );
}
