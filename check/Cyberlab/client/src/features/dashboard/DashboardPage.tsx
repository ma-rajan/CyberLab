import { useAuth } from '../auth/useAuth';

export function DashboardPage() {
  const { user } = useAuth();
  return (
    <section className="rounded-xl border border-slate-800 bg-panel p-10">
      <p className="font-mono text-sm text-signal">// AUTHENTICATED SESSION</p>
      <h1 className="mt-3 text-4xl font-bold text-white">Dashboard</h1>
      <p className="mt-4 text-slate-300">
        Signed in as <span className="text-cyber">{user?.username}</span>.
      </p>
      <p className="mt-2 text-sm text-slate-500">
        Visit the Labs section to track your upcoming learning modules.
      </p>
    </section>
  );
}
