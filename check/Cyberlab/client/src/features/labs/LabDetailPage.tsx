import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError, api, type ApiLab, type ApiLabProgress, type ApiLabSession } from '../../lib/api';
import { categoryLabel, difficultyLabel, progressLabel } from './lab-ui';

export function LabDetailPage() {
  const { slug = '' } = useParams();
  const [lab, setLab] = useState<ApiLab | null>(null);
  const [progress, setProgress] = useState<ApiLabProgress | null>(null);
  const [session, setSession] = useState<ApiLabSession | null>(null);
  const [submission, setSubmission] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([api.lab(slug), api.labProgress()])
      .then(([labData, progressData]) => {
        setLab(labData.lab);
        const current = progressData.progress.find((entry) => entry.labId === labData.lab.id) ?? null;
        setProgress(current);
        if (current?.status === 'IN_PROGRESS') return api.labSession(slug).then(({ session: currentSession }) => setSession(currentSession));
        return undefined;
      })
      .catch((requestError) => setError(requestError instanceof ApiError ? requestError.message : 'Unable to load this lab.'))
      .finally(() => setIsLoading(false));
  }, [slug]);

  async function startLab() {
    setError(null); setIsSubmitting(true);
    try { const response = await api.startLab(slug); setProgress(response.progress); setSession(response.session); }
    catch (requestError) { setError(requestError instanceof ApiError ? requestError.message : 'Unable to start this lab.'); }
    finally { setIsSubmitting(false); }
  }

  async function submitLab(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null); setResult(null); setIsSubmitting(true);
    try {
      const response = await api.submitLab(slug, submission ? { confirmation: submission } : {});
      setResult(response.message); setSession(response.session);
      if (response.progress) setProgress(response.progress);
    } catch (requestError) { setError(requestError instanceof ApiError ? requestError.message : 'Unable to submit this attempt.'); }
    finally { setIsSubmitting(false); }
  }

  if (isLoading) return <p className="font-mono text-cyber">Loading lab…</p>;
  if (error && !lab) return <p role="alert" className="text-red-300">{error}</p>;
  if (!lab) return <p role="alert" className="text-red-300">Lab not found.</p>;

  const isCompleted = progress?.status === 'COMPLETED' || session?.status === 'COMPLETED';
  const isStarted = Boolean(progress && progress.status !== 'NOT_STARTED');
  return (
    <section className="mx-auto max-w-3xl rounded-xl border border-slate-800 bg-panel p-8">
      <Link to="/labs" className="text-sm text-cyber hover:text-cyan-200">← Back to labs</Link>
      <p className="mt-7 font-mono text-sm text-cyber">// LAB ENGINE</p>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-4xl font-bold text-white">{lab.title}</h1>
        <span className="rounded bg-cyan-950 px-3 py-1.5 text-sm font-medium text-cyber">{isCompleted ? 'Completed' : 'Safe Preview'}</span>
      </div>
      <p className="mt-5 leading-7 text-slate-300">{lab.description}</p>
      <dl className="mt-8 grid gap-4 sm:grid-cols-2">
        <div><dt className="text-xs uppercase tracking-wide text-slate-500">Category</dt><dd className="mt-1 text-slate-200">{categoryLabel(lab.category)}</dd></div>
        <div><dt className="text-xs uppercase tracking-wide text-slate-500">Difficulty</dt><dd className="mt-1 text-slate-200">{difficultyLabel(lab.difficulty)}</dd></div>
        <div><dt className="text-xs uppercase tracking-wide text-slate-500">Estimated time</dt><dd className="mt-1 text-slate-200">{lab.estimatedMinutes} minutes</dd></div>
        <div><dt className="text-xs uppercase tracking-wide text-slate-500">Points</dt><dd className="mt-1 text-signal">{lab.points}</dd></div>
        <div><dt className="text-xs uppercase tracking-wide text-slate-500">Your progress</dt><dd className="mt-1 text-cyber">{progressLabel(progress?.status)}</dd></div>
      </dl>
      <div className="mt-8 space-y-5 border-t border-slate-800 pt-6">
        <div><h2 className="text-lg font-semibold text-white">Objective</h2><p className="mt-2 text-slate-300">{lab.objective || 'Review the learning objective for this upcoming lab.'}</p></div>
        <div><h2 className="text-lg font-semibold text-white">Instructions</h2><p className="mt-2 whitespace-pre-line text-slate-300">{lab.instructions || 'Interactive instructions will be added with the isolated lab runtime.'}</p></div>
        {(lab.hints ?? []).length > 0 && <div><h2 className="text-lg font-semibold text-white">Hints</h2><ul className="mt-2 list-disc space-y-1 pl-5 text-slate-400">{(lab.hints ?? []).map((hint) => <li key={hint}>{hint}</li>)}</ul></div>}
      </div>
      {error && <p role="alert" className="mt-5 text-sm text-red-300">{error}</p>}
      {result && <p role="status" className="mt-5 rounded-md border border-cyber/40 bg-cyan-950/30 px-4 py-3 text-sm text-cyber">{result}</p>}
      <div className="mt-7">
        {!isStarted && <button type="button" disabled={isSubmitting} onClick={startLab} className="rounded-md bg-cyber px-4 py-2 font-semibold text-ink disabled:opacity-60">{isSubmitting ? 'Starting…' : 'Start Lab'}</button>}
        {isStarted && !isCompleted && <form onSubmit={submitLab} className="space-y-3"><label htmlFor="submission" className="block text-sm font-medium text-slate-200">Submission</label><input id="submission" value={submission} onChange={(event) => setSubmission(event.target.value)} placeholder="Enter the safe preview confirmation" className="w-full rounded-md border border-slate-700 bg-ink px-3 py-2 text-white outline-none focus:border-cyber" /><button type="submit" disabled={isSubmitting} className="rounded-md bg-cyber px-4 py-2 font-semibold text-ink disabled:opacity-60">{isSubmitting ? 'Submitting…' : 'Submit Attempt'}</button></form>}
        {isCompleted && <span className="rounded-md border border-signal/50 px-4 py-2 font-medium text-signal">Completed — {lab.points} points</span>}
      </div>
    </section>
  );
}
