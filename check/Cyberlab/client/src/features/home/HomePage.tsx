import { Link } from 'react-router-dom';

export function HomePage() {
  return (
    <section className="grid gap-12 py-12 lg:grid-cols-[1.3fr_0.7fr] lg:items-center">
      <div>
        <p className="mb-5 font-mono text-sm tracking-widest text-signal">
          LOCAL TRAINING ENVIRONMENT
        </p>
        <h1 className="max-w-3xl text-5xl font-bold leading-tight tracking-tight text-white sm:text-6xl">
          Learn web security in your own <span className="text-cyber">CyberLab</span>.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
          A guided local platform for understanding web security concepts, challenge workflows, and
          secure remediation.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            to="/challenges"
            className="rounded-md bg-cyber px-5 py-3 font-semibold text-ink transition hover:bg-cyan-300"
          >
            Explore challenges
          </Link>
          <Link
            to="/dashboard"
            className="rounded-md border border-slate-700 px-5 py-3 font-semibold text-slate-200 transition hover:border-cyber/60 hover:text-cyber"
          >
            View dashboard
          </Link>
        </div>
      </div>
      <div className="rounded-xl border border-cyan-900/70 bg-panel p-6 shadow-2xl shadow-cyan-950/20">
        <div className="mb-5 flex items-center justify-between font-mono text-xs text-slate-400">
          <span>CYBERLAB_STATUS</span>
          <span className="text-signal">● FOUNDATION READY</span>
        </div>
        <div className="space-y-3 font-mono text-sm">
          <p>
            <span className="text-cyber">$</span> environment:{' '}
            <span className="text-slate-300">local-only</span>
          </p>
          <p>
            <span className="text-cyber">$</span> platform:{' '}
            <span className="text-slate-300">secure foundation</span>
          </p>
          <p>
            <span className="text-cyber">$</span> labs:{' '}
            <span className="text-slate-500">coming in a later phase</span>
          </p>
        </div>
      </div>
    </section>
  );
}
