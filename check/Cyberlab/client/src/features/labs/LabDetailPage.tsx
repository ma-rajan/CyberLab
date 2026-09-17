import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError, api, type ApiLab, type ApiLabProgress } from '../../lib/api';
import { categoryLabel, difficultyLabel, progressLabel } from './lab-ui';

export function LabDetailPage() {
  const { slug = '' } = useParams();
  const [lab, setLab] = useState<ApiLab | null>(null);
  const [progress, setProgress] = useState<ApiLabProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([api.lab(slug), api.labProgress()])
      .then(([labData, progressData]) => {
        setLab(labData.lab);
        setProgress(progressData.progress.find((entry) => entry.labId === labData.lab.id) ?? null);
      })
      .catch((requestError) =>
        setError(requestError instanceof ApiError ? requestError.message : 'Unable to load this lab.'),
      )
      .finally(() => setIsLoading(false));
  }, [slug]);

  async function updateProgress(action: 'start' | 'complete') {
    if (!lab) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const result = action === 'start' ? await api.startLab(lab.slug) : await api.completeLab(lab.slug);
      setProgress(result.progress);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Unable to update progress.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) return <p className="font-mono text-cyber">Loading lab…</p>;
  if (error && !lab) return <p role="alert" className="text-red-300">{error}</p>;
  if (!lab) return <p role="alert" className="text-red-300">Lab not found.</p>;

  const isCompleted = progress?.status === 'COMPLETED';
  return (
    <section className="mx-auto max-w-3xl rounded-xl border border-slate-800 bg-panel p-8">
      <Link to="/labs" className="text-sm text-cyber hover:text-cyan-200">← Back to labs</Link>
      <p className="mt-7 font-mono text-sm text-cyber">// LAB METADATA</p>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-4xl font-bold text-white">{lab.title}</h1>
        <span className="rounded bg-cyan-950 px-3 py-1.5 text-sm font-medium text-cyber">Coming Soon</span>
      </div>
      <p className="mt-5 leading-7 text-slate-300">{lab.description}</p>
      <dl className="mt-8 grid gap-4 sm:grid-cols-2">
        <div><dt className="text-xs uppercase tracking-wide text-slate-500">Category</dt><dd className="mt-1 text-slate-200">{categoryLabel(lab.category)}</dd></div>
        <div><dt className="text-xs uppercase tracking-wide text-slate-500">Difficulty</dt><dd className="mt-1 text-slate-200">{difficultyLabel(lab.difficulty)}</dd></div>
        <div><dt className="text-xs uppercase tracking-wide text-slate-500">Estimated time</dt><dd className="mt-1 text-slate-200">{lab.estimatedMinutes} minutes</dd></div>
        <div><dt className="text-xs uppercase tracking-wide text-slate-500">Points</dt><dd className="mt-1 text-signal">{lab.points}</dd></div>
        <div><dt className="text-xs uppercase tracking-wide text-slate-500">Your progress</dt><dd className="mt-1 text-cyber">{progressLabel(progress?.status)}</dd></div>
      </dl>
      <p className="mt-8 rounded-md border border-slate-700 bg-ink px-4 py-3 text-sm text-slate-300">Lab content coming soon.</p>
      {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
      <div className="mt-6 flex flex-wrap gap-3">
        {!progress && <button type="button" disabled={isSubmitting} onClick={() => updateProgress('start')} className="rounded-md bg-cyber px-4 py-2 font-semibold text-ink disabled:opacity-60">{isSubmitting ? 'Saving…' : 'Start Lab'}</button>}
        {progress && !isCompleted && <button type="button" disabled={isSubmitting} onClick={() => updateProgress('complete')} className="rounded-md bg-cyber px-4 py-2 font-semibold text-ink disabled:opacity-60">{isSubmitting ? 'Saving…' : 'Complete Lab'}</button>}
        {isCompleted && <span className="rounded-md border border-signal/50 px-4 py-2 font-medium text-signal">Completed</span>}
      </div>
    </section>
  );
}
