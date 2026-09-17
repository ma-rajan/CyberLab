import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, api, type ApiLab, type ApiLabProgress, type LabCategory, type LabDifficulty } from '../../lib/api';
import { categoryLabel, difficultyLabel, progressLabel } from './lab-ui';

const categoryOptions: Array<LabCategory | 'ALL'> = [
  'ALL',
  'WEB_SECURITY',
  'AUTHENTICATION',
  'ACCESS_CONTROL',
  'INJECTION',
  'CLIENT_SIDE_SECURITY',
  'NETWORK_SECURITY',
  'OTHER',
];
const difficultyOptions: Array<LabDifficulty | 'ALL'> = ['ALL', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED'];

export function LabsPage() {
  const [labs, setLabs] = useState<ApiLab[]>([]);
  const [progress, setProgress] = useState<ApiLabProgress[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<LabCategory | 'ALL'>('ALL');
  const [difficulty, setDifficulty] = useState<LabDifficulty | 'ALL'>('ALL');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.labs(), api.labProgress()])
      .then(([labData, progressData]) => {
        setLabs(labData.labs);
        setProgress(progressData.progress);
      })
      .catch((requestError) =>
        setError(requestError instanceof ApiError ? requestError.message : 'Unable to load labs.'),
      )
      .finally(() => setIsLoading(false));
  }, []);

  const progressByLabId = useMemo(
    () => new Map(progress.map((entry) => [entry.labId, entry])),
    [progress],
  );
  const filteredLabs = useMemo(() => {
    const query = search.trim().toLowerCase();
    return labs.filter(
      (lab) =>
        (category === 'ALL' || lab.category === category) &&
        (difficulty === 'ALL' || lab.difficulty === difficulty) &&
        (!query || `${lab.title} ${lab.description} ${lab.category}`.toLowerCase().includes(query)),
    );
  }, [labs, search, category, difficulty]);

  if (isLoading) return <p className="font-mono text-cyber">Loading labs…</p>;
  if (error) return <p role="alert" className="text-red-300">{error}</p>;

  return (
    <section>
      <p className="font-mono text-sm text-cyber">// LAB CATALOG</p>
      <h1 className="mt-3 text-4xl font-bold text-white">Labs</h1>
      <p className="mt-3 max-w-2xl text-slate-300">
        Explore secure metadata for upcoming learning modules. Lab content is coming soon.
      </p>
      <div className="mt-8 grid gap-3 rounded-xl border border-slate-800 bg-panel p-4 md:grid-cols-3">
        <input
          aria-label="Search labs"
          type="search"
          placeholder="Search labs..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="rounded-md border border-slate-700 bg-ink px-3 py-2 text-white outline-none focus:border-cyber"
        />
        <select
          aria-label="Filter by category"
          value={category}
          onChange={(event) => setCategory(event.target.value as LabCategory | 'ALL')}
          className="rounded-md border border-slate-700 bg-ink px-3 py-2 text-white outline-none focus:border-cyber"
        >
          {categoryOptions.map((option) => <option key={option} value={option}>{option === 'ALL' ? 'All categories' : categoryLabel(option)}</option>)}
        </select>
        <select
          aria-label="Filter by difficulty"
          value={difficulty}
          onChange={(event) => setDifficulty(event.target.value as LabDifficulty | 'ALL')}
          className="rounded-md border border-slate-700 bg-ink px-3 py-2 text-white outline-none focus:border-cyber"
        >
          {difficultyOptions.map((option) => <option key={option} value={option}>{option === 'ALL' ? 'All difficulties' : difficultyLabel(option)}</option>)}
        </select>
      </div>
      {filteredLabs.length === 0 ? (
        <p className="mt-8 text-slate-400">No labs match the selected filters.</p>
      ) : (
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {filteredLabs.map((lab) => {
            const labProgress = progressByLabId.get(lab.id);
            return (
              <Link key={lab.id} to={`/labs/${lab.slug}`} className="rounded-xl border border-slate-800 bg-panel p-6 transition hover:border-cyber/60 hover:bg-slate-900">
                <div className="flex items-start justify-between gap-4">
                  <h2 className="text-xl font-semibold text-white">{lab.title}</h2>
                  <span className="rounded bg-cyan-950 px-2 py-1 text-xs font-medium text-cyber">Coming Soon</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-400">{lab.description}</p>
                <div className="mt-5 flex flex-wrap gap-2 text-xs">
                  <span className="rounded bg-slate-800 px-2 py-1 text-slate-200">{categoryLabel(lab.category)}</span>
                  <span className="rounded bg-slate-800 px-2 py-1 text-slate-200">{difficultyLabel(lab.difficulty)}</span>
                  <span className="rounded bg-slate-800 px-2 py-1 text-slate-200">{lab.estimatedMinutes} minutes</span>
                  <span className="rounded bg-slate-800 px-2 py-1 text-signal">{lab.points} points</span>
                </div>
                <p className="mt-4 text-sm text-cyber">{progressLabel(labProgress?.status)}</p>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
