import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ApiError,
  api,
  type ApiLab,
  type ApiLabProgress,
  type ApiLabSession,
  type ApiProductSearchResult,
} from '../../lib/api';
import { categoryLabel, difficultyLabel, progressLabel } from './lab-ui';

export function LabDetailPage() {
  const { slug = '' } = useParams();
  const [lab, setLab] = useState<ApiLab | null>(null);
  const [progress, setProgress] = useState<ApiLabProgress | null>(null);
  const [session, setSession] = useState<ApiLabSession | null>(null);
  const [submission, setSubmission] = useState('');
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<ApiProductSearchResult[] | null>(null);
  const [queryPreview, setQueryPreview] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [feedbackDocument, setFeedbackDocument] = useState<string | null>(null);
  const [completionToken, setCompletionToken] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([api.lab(slug), api.labProgress()])
      .then(([labData, progressData]) => {
        setLab(labData.lab);
        const current =
          progressData.progress.find((entry) => entry.labId === labData.lab.id) ?? null;
        setProgress(current);
        if (current?.status === 'IN_PROGRESS')
          return api
            .labSession(slug)
            .then(({ session: currentSession }) => setSession(currentSession));
        return undefined;
      })
      .catch((requestError) =>
        setError(
          requestError instanceof ApiError ? requestError.message : 'Unable to load this lab.',
        ),
      )
      .finally(() => setIsLoading(false));
  }, [slug]);

  async function startLab() {
    setError(null);
    setIsSubmitting(true);
    try {
      const response = await api.startLab(slug);
      setProgress(response.progress);
      setSession(response.session);
    } catch (requestError) {
      setError(
        requestError instanceof ApiError ? requestError.message : 'Unable to start this lab.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitLab(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResult(null);
    setIsSubmitting(true);
    try {
      const response = await api.submitLab(
        slug,
        submission
          ? lab?.challengeType === 'SQL_INJECTION_PRODUCT_SEARCH' || lab?.challengeType === 'XSS_FEEDBACK_SEARCH'
            ? { flag: submission }
            : { confirmation: submission }
          : {},
      );
      setResult(response.message);
      setSession(response.session);
      if (response.progress) setProgress(response.progress);
    } catch (requestError) {
      setError(
        requestError instanceof ApiError ? requestError.message : 'Unable to submit this attempt.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function searchProducts(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const response = await api.searchProducts(slug, search);
      setQueryPreview(response.queryPreview);
      setSearchResults(response.results);
    } catch (requestError) {
      setError(
        requestError instanceof ApiError ? requestError.message : 'Unable to search the target.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function searchFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null); setCompletionToken(null); setIsSubmitting(true);
    try {
      const response = await api.searchFeedback(slug, feedback);
      setFeedbackDocument(response.document); setCompletionToken(response.completionToken);
    } catch (requestError) { setError(requestError instanceof ApiError ? requestError.message : 'Unable to load the target preview.'); }
    finally { setIsSubmitting(false); }
  }

  if (isLoading) return <p className="font-mono text-cyber">Loading lab…</p>;
  if (error && !lab)
    return (
      <p role="alert" className="text-red-300">
        {error}
      </p>
    );
  if (!lab)
    return (
      <p role="alert" className="text-red-300">
        Lab not found.
      </p>
    );

  const isCompleted = progress?.status === 'COMPLETED' || session?.status === 'COMPLETED';
  const isStarted = Boolean(progress && progress.status !== 'NOT_STARTED');
  return (
    <section className="mx-auto max-w-3xl rounded-xl border border-slate-800 bg-panel p-8">
      <Link to="/labs" className="text-sm text-cyber hover:text-cyan-200">
        ← Back to labs
      </Link>
      <p className="mt-7 font-mono text-sm text-cyber">// LAB ENGINE</p>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-4xl font-bold text-white">{lab.title}</h1>
        <span className="rounded bg-cyan-950 px-3 py-1.5 text-sm font-medium text-cyber">
          {isCompleted ? 'Completed' : 'Safe Preview'}
        </span>
      </div>
      <p className="mt-5 leading-7 text-slate-300">{lab.description}</p>
      <dl className="mt-8 grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Category</dt>
          <dd className="mt-1 text-slate-200">{categoryLabel(lab.category)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Difficulty</dt>
          <dd className="mt-1 text-slate-200">{difficultyLabel(lab.difficulty)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Estimated time</dt>
          <dd className="mt-1 text-slate-200">{lab.estimatedMinutes} minutes</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Points</dt>
          <dd className="mt-1 text-signal">{lab.points}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Your progress</dt>
          <dd className="mt-1 text-cyber">{progressLabel(progress?.status)}</dd>
        </div>
      </dl>
      <div className="mt-8 space-y-5 border-t border-slate-800 pt-6">
        <div>
          <h2 className="text-lg font-semibold text-white">Objective</h2>
          <p className="mt-2 text-slate-300">
            {lab.objective || 'Review the learning objective for this upcoming lab.'}
          </p>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Instructions</h2>
          <p className="mt-2 whitespace-pre-line text-slate-300">
            {lab.instructions ||
              'Interactive instructions will be added with the isolated lab runtime.'}
          </p>
        </div>
        {lab.target && (
          <div>
            <h2 className="text-lg font-semibold text-white">Target</h2>
            <p className="mt-2 font-mono text-sm text-slate-300">{lab.target}</p>
          </div>
        )}
        {(lab.hints ?? []).length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-white">Hints</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-400">
              {(lab.hints ?? []).map((hint) => (
                <li key={hint}>{hint}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-5 text-sm text-red-300">
          {error}
        </p>
      )}
      {result && (
        <p
          role="status"
          className="mt-5 rounded-md border border-cyber/40 bg-cyan-950/30 px-4 py-3 text-sm text-cyber"
        >
          {result}
        </p>
      )}
      <div className="mt-7">
        {!isStarted && (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={startLab}
            className="rounded-md bg-cyber px-4 py-2 font-semibold text-ink disabled:opacity-60"
          >
            {isSubmitting ? 'Starting…' : 'Start Lab'}
          </button>
        )}
        {isStarted && !isCompleted && lab.challengeType === 'SQL_INJECTION_PRODUCT_SEARCH' && (
          <div className="mb-8 rounded-lg border border-slate-700 bg-ink/50 p-5">
            <h2 className="text-lg font-semibold text-white">Product Search target</h2>
            <p className="mt-1 text-sm text-slate-400">
              This isolated local target contains only challenge data.
            </p>
            <form onSubmit={searchProducts} className="mt-4 flex flex-wrap gap-3">
              <input
                aria-label="Product search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search products"
                className="min-w-52 flex-1 rounded-md border border-slate-700 bg-ink px-3 py-2 text-white outline-none focus:border-cyber"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-md border border-cyber/60 px-4 py-2 font-semibold text-cyber disabled:opacity-60"
              >
                Search
              </button>
            </form>
            {queryPreview && (
              <pre className="mt-4 overflow-x-auto rounded bg-black/30 p-3 text-xs text-signal">
                {queryPreview}
              </pre>
            )}
            {searchResults && (
              <ul className="mt-4 space-y-2">
                {searchResults.map((product) => (
                  <li key={product.name} className="rounded border border-slate-800 p-3 text-sm">
                    <p className="font-medium text-slate-100">
                      {product.name} <span className="text-signal">{product.price}</span>
                    </p>
                    <p className="mt-1 text-slate-400">{product.description}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {isStarted && !isCompleted && lab.challengeType === 'XSS_FEEDBACK_SEARCH' && (
          <div className="mb-8 rounded-lg border border-slate-700 bg-ink/50 p-5">
            <h2 className="text-lg font-semibold text-white">Feedback Search target</h2>
            <p className="mt-1 text-sm text-slate-400">This target preview runs in a sandboxed local document, separate from CyberLab.</p>
            <form onSubmit={searchFeedback} className="mt-4 flex flex-wrap gap-3">
              <input aria-label="Feedback search" value={feedback} onChange={(event) => setFeedback(event.target.value)} placeholder="Search feedback" className="min-w-52 flex-1 rounded-md border border-slate-700 bg-ink px-3 py-2 text-white outline-none focus:border-cyber" />
              <button type="submit" disabled={isSubmitting} className="rounded-md border border-cyber/60 px-4 py-2 font-semibold text-cyber disabled:opacity-60">Preview</button>
            </form>
            {feedbackDocument && <iframe title="Isolated Feedback Search preview" sandbox="allow-scripts" referrerPolicy="no-referrer" srcDoc={feedbackDocument} className="mt-4 h-48 w-full rounded border border-slate-700 bg-white" />}
            {completionToken && <p className="mt-4 rounded border border-signal/40 bg-signal/10 px-3 py-2 text-sm text-signal">Training markup detected. Completion value: <code>{completionToken}</code></p>}
          </div>
        )}
        {isStarted && !isCompleted && (
          <form onSubmit={submitLab} className="space-y-3">
            <label htmlFor="submission" className="block text-sm font-medium text-slate-200">
              {lab.challengeType === 'SQL_INJECTION_PRODUCT_SEARCH' || lab.challengeType === 'XSS_FEEDBACK_SEARCH'
                ? 'Flag submission'
                : 'Submission'}
            </label>
            <input
              id="submission"
              value={submission}
              onChange={(event) => setSubmission(event.target.value)}
              placeholder={
                lab.challengeType === 'SQL_INJECTION_PRODUCT_SEARCH' || lab.challengeType === 'XSS_FEEDBACK_SEARCH'
                  ? 'Enter the flag you discovered'
                  : 'Enter the safe preview confirmation'
              }
              className="w-full rounded-md border border-slate-700 bg-ink px-3 py-2 text-white outline-none focus:border-cyber"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-cyber px-4 py-2 font-semibold text-ink disabled:opacity-60"
            >
              {isSubmitting ? 'Submitting…' : 'Submit Attempt'}
            </button>
          </form>
        )}
        {isCompleted && (
          <span className="rounded-md border border-signal/50 px-4 py-2 font-medium text-signal">
            Completed — {lab.points} points
          </span>
        )}
      </div>
    </section>
  );
}
