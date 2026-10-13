import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ApiError,
  api,
  type ApiLab,
  type ApiLabProgress,
  type ApiLabSession,
  type ApiProductSearchResult,
  type ApiTrainingProfile,
  type ApiTrainingLoginResult,
  type ApiTrainingReport,
  type ApiMockFetchResponse,
  type ApiDirectoryRecord,
  type ApiProfileUploadResult,
  type ApiCsrfSettings,
  type ApiTrainingFile,
  type ApiSstiPreview,
  type ApiCorsSimulation,
  type ApiCommandInjectionSimulation,
  type ApiBusinessLogicRaceSimulation,
} from '../../lib/api';
import { categoryLabel, difficultyLabel, hasInteractiveTarget, progressLabel } from './lab-ui';

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
  const [profileId, setProfileId] = useState('101');
  const [profile, setProfile] = useState<ApiTrainingProfile | null>(null);
  const [profileCompletionToken, setProfileCompletionToken] = useState<string | null>(null);
  const [trainingUsername, setTrainingUsername] = useState('');
  const [trainingPassword, setTrainingPassword] = useState('');
  const [trainingLoginResult, setTrainingLoginResult] = useState<ApiTrainingLoginResult | null>(null);
  const [reportSection, setReportSection] = useState<'overview' | 'admin-audit'>('overview');
  const [trainingReport, setTrainingReport] = useState<ApiTrainingReport | null>(null);
  const [mockUrl, setMockUrl] = useState('/public/status');
  const [mockFetchResponse, setMockFetchResponse] = useState<ApiMockFetchResponse | null>(null);
  const [directoryQuery, setDirectoryQuery] = useState('alice');
  const [directoryPreview, setDirectoryPreview] = useState<string | null>(null);
  const [directoryRecords, setDirectoryRecords] = useState<ApiDirectoryRecord[] | null>(null);
  const [trainingFilePath, setTrainingFilePath] = useState('readme.txt');
  const [trainingFile, setTrainingFile] = useState<ApiTrainingFile | null>(null);
  const [sstiInput, setSstiInput] = useState('{{7*7}}');
  const [sstiPreview, setSstiPreview] = useState<ApiSstiPreview | null>(null);
  const [corsOrigin, setCorsOrigin] = useState('https://attacker.training.test');
  const [corsMethod, setCorsMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'>('GET');
  const [corsHeaderName, setCorsHeaderName] = useState('');
  const [corsHeaderValue, setCorsHeaderValue] = useState('demo');
  const [corsCredentials, setCorsCredentials] = useState(true);
  const [corsSimulation, setCorsSimulation] = useState<ApiCorsSimulation | null>(null);
  const [commandInput, setCommandInput] = useState('');
  const [commandMode, setCommandMode] = useState<'vulnerable' | 'secure'>('vulnerable');
  const [commandSimulation, setCommandSimulation] = useState<ApiCommandInjectionSimulation | null>(null);
  const [couponHistory, setCouponHistory] = useState<ApiBusinessLogicRaceSimulation[]>([]);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileUploadResult, setProfileUploadResult] = useState<ApiProfileUploadResult | null>(null);
  const [csrfSettings, setCsrfSettings] = useState<ApiCsrfSettings | null>(null);
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
            .then(({ session: currentSession }) => { setSession(currentSession); if (labData.lab.challengeType === 'CSRF') return api.csrfSettings(slug).then(setCsrfSettings); return undefined; });
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
      if (lab?.challengeType === 'CSRF') setCsrfSettings(await api.csrfSettings(slug));
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
          ? lab?.challengeType === 'COMMAND_INJECTION_SIMULATOR'
            ? { confirmation: submission.trim().toLowerCase() === 'verify' }
            : lab?.challengeType === 'BUSINESS_LOGIC_RACE_SIMULATOR'
              ? { confirmation: submission.trim().toLowerCase() === 'verify' }
            : hasInteractiveTarget(lab?.challengeType ?? '')
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

  async function viewProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null); setProfileCompletionToken(null); setIsSubmitting(true);
    try {
      const response = await api.trainingProfile(slug, profileId);
      setProfile(response.profile); setProfileCompletionToken(response.completionToken);
    } catch (requestError) { setError(requestError instanceof ApiError ? requestError.message : 'Unable to load the training profile.'); }
    finally { setIsSubmitting(false); }
  }

  async function loginTrainingTarget(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null); setTrainingLoginResult(null); setIsSubmitting(true);
    try {
      setTrainingLoginResult(await api.trainingLogin(slug, { username: trainingUsername, password: trainingPassword }));
    } catch (requestError) { setError(requestError instanceof ApiError ? requestError.message : 'Unable to submit the training login.'); }
    finally { setIsSubmitting(false); }
  }

  async function viewTrainingReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null); setTrainingReport(null); setIsSubmitting(true);
    try {
      setTrainingReport(await api.trainingReport(slug, reportSection));
    } catch (requestError) { setError(requestError instanceof ApiError ? requestError.message : 'Unable to load the training workspace.'); }
    finally { setIsSubmitting(false); }
  }

  async function fetchMockResource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null); setMockFetchResponse(null); setIsSubmitting(true);
    try {
      setMockFetchResponse(await api.fetchMockResource(slug, mockUrl));
    } catch (requestError) { setError(requestError instanceof ApiError ? requestError.message : 'Unable to fetch the mock target.'); }
    finally { setIsSubmitting(false); }
  }

  async function searchDirectory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null); setDirectoryPreview(null); setDirectoryRecords(null); setIsSubmitting(true);
    try {
      const response = await api.searchDirectory(slug, directoryQuery);
      setDirectoryPreview(response.queryPreview); setDirectoryRecords(response.records);
    } catch (requestError) { setError(requestError instanceof ApiError ? requestError.message : 'Unable to search the mock directory.'); }
    finally { setIsSubmitting(false); }
  }

  async function readTrainingFileHandler(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null); setTrainingFile(null); setIsSubmitting(true);
    try { setTrainingFile(await api.readTrainingFile(slug, trainingFilePath)); }
    catch (requestError) { setError(requestError instanceof ApiError ? requestError.message : 'Unable to read the training file.'); }
    finally { setIsSubmitting(false); }
  }

  async function renderSstiPreviewHandler(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null); setSstiPreview(null); setIsSubmitting(true);
    try { setSstiPreview(await api.renderSstiPreview(slug, sstiInput)); }
    catch (requestError) { setError(requestError instanceof ApiError ? requestError.message : 'Unable to render the training template preview.'); }
    finally { setIsSubmitting(false); }
  }

  async function simulateCorsPolicy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null); setCorsSimulation(null); setIsSubmitting(true);
    try {
      const origin = corsOrigin.trim();
      const headers = corsHeaderName.trim() ? [{ name: corsHeaderName.trim(), value: corsHeaderValue }] : [];
      const simulation = await api.simulateCorsPolicy(slug, {
        ...(origin ? { origin } : {}),
        method: corsMethod,
        headers,
        credentials: corsCredentials,
      });
      setCorsSimulation(simulation);
      if (simulation.completionToken) setResult('You compared permissive access, preflight handling, and the credentialed wildcard rule. Submit the completion value below.');
    } catch (requestError) { setError(requestError instanceof ApiError ? requestError.message : 'Unable to run the local CORS policy simulation.'); }
    finally { setIsSubmitting(false); }
  }

  async function simulateCommandTarget(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null); setCommandSimulation(null); setIsSubmitting(true);
    try {
      setCommandSimulation(await api.simulateCommandInjection(slug, { mode: commandMode, input: commandInput }));
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Unable to run the synthetic diagnostics simulator.');
    } finally { setIsSubmitting(false); }
  }

  async function runCouponSimulation(action: 'inspect' | 'prepare' | 'record' | 'secure-batch', attemptId?: 'attempt-a' | 'attempt-b') {
    setError(null); setIsSubmitting(true);
    try {
      const response = await api.simulateBusinessLogicRace(slug, { action, ...(attemptId ? { attemptId } : {}) });
      setCouponHistory((history) => [...history, response]);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Unable to run the synthetic coupon simulation.');
    } finally { setIsSubmitting(false); }
  }

  async function uploadProfileImage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null); setProfileUploadResult(null);
    if (!profileImage) { setError('Choose a file to upload to the training target.'); return; }
    setIsSubmitting(true);
    try { setProfileUploadResult(await api.uploadProfileImage(slug, profileImage)); }
    catch (requestError) { setError(requestError instanceof ApiError ? requestError.message : 'Unable to upload to the training target.'); }
    finally { setIsSubmitting(false); }
  }
  async function simulateCsrfNotificationChange() { setError(null); setResult(null); setIsSubmitting(true); try { const updated = await api.simulateCsrfNotificationChange(slug); setCsrfSettings(updated); if (updated.completionToken) setResult('The attacker-request simulator changed the training victim setting without a CSRF token. Submit the completion value below.'); } catch (requestError) { setError(requestError instanceof ApiError ? requestError.message : 'Unable to submit the attacker-request simulation.'); } finally { setIsSubmitting(false); } }
  async function updateCsrfSettingsSecurely() { setError(null); setResult(null); setIsSubmitting(true); try { setCsrfSettings(await api.updateCsrfSettingsSecurely(slug, true)); } catch (requestError) { setError(requestError instanceof ApiError ? requestError.message : 'Unable to submit the protected comparison request.'); } finally { setIsSubmitting(false); } }

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
        {isStarted && !isCompleted && lab.challengeType === 'IDOR_PROFILE_ACCESS' && (
          <div className="mb-8 rounded-lg border border-slate-700 bg-ink/50 p-5">
            <h2 className="text-lg font-semibold text-white">Profile Access target</h2>
            <p className="mt-1 text-sm text-slate-400">This target contains fixed synthetic training profiles only.</p>
            <form onSubmit={viewProfile} className="mt-4 flex flex-wrap gap-3">
              <input aria-label="Profile ID" inputMode="numeric" value={profileId} onChange={(event) => setProfileId(event.target.value)} className="min-w-36 flex-1 rounded-md border border-slate-700 bg-ink px-3 py-2 text-white outline-none focus:border-cyber" />
              <button type="submit" disabled={isSubmitting} className="rounded-md border border-cyber/60 px-4 py-2 font-semibold text-cyber disabled:opacity-60">View Profile</button>
            </form>
            {profile && <div className="mt-4 rounded border border-slate-800 p-3 text-sm"><p className="font-medium text-slate-100">{profile.displayName} <span className="text-signal">#{profile.id}</span></p><p className="mt-1 text-slate-400">{profile.role} — {profile.bio}</p></div>}
            {profileCompletionToken && <p className="mt-4 rounded border border-signal/40 bg-signal/10 px-3 py-2 text-sm text-signal">Unauthorized synthetic profile accessed. Completion value: <code>{profileCompletionToken}</code></p>}
          </div>
        )}
        {isStarted && !isCompleted && lab.challengeType === 'AUTHENTICATION_BYPASS' && (
          <div className="mb-8 rounded-lg border border-slate-700 bg-ink/50 p-5">
            <h2 className="text-lg font-semibold text-white">Training Login target</h2>
            <p className="mt-1 text-sm text-slate-400">This controlled target uses fixed in-memory credentials and never changes your CyberLab session.</p>
            <form onSubmit={loginTrainingTarget} className="mt-4 space-y-3">
              <input aria-label="Training username" value={trainingUsername} onChange={(event) => setTrainingUsername(event.target.value)} placeholder="Username" autoComplete="off" className="w-full rounded-md border border-slate-700 bg-ink px-3 py-2 text-white outline-none focus:border-cyber" />
              <input aria-label="Training password" type="password" value={trainingPassword} onChange={(event) => setTrainingPassword(event.target.value)} placeholder="Password" autoComplete="off" className="w-full rounded-md border border-slate-700 bg-ink px-3 py-2 text-white outline-none focus:border-cyber" />
              <button type="submit" disabled={isSubmitting} className="rounded-md border border-cyber/60 px-4 py-2 font-semibold text-cyber disabled:opacity-60">Log In to Training Target</button>
            </form>
            {trainingLoginResult && <p className="mt-4 rounded border border-slate-800 px-3 py-2 text-sm text-slate-300">{trainingLoginResult.message}{trainingLoginResult.role ? ` Role: ${trainingLoginResult.role}.` : ''}{trainingLoginResult.completionToken ? <> Completion value: <code className="text-signal">{trainingLoginResult.completionToken}</code></> : null}</p>}
          </div>
        )}
        {isStarted && !isCompleted && lab.challengeType === 'BROKEN_FUNCTION_ACCESS' && (
          <div className="mb-8 rounded-lg border border-slate-700 bg-ink/50 p-5">
            <h2 className="text-lg font-semibold text-white">Training Workspace target</h2>
            <p className="mt-1 text-sm text-slate-400">This controlled target returns fixed synthetic workspace data and never accesses platform roles or records.</p>
            <form onSubmit={viewTrainingReport} className="mt-4 flex flex-wrap gap-3">
              <select aria-label="Workspace section" value={reportSection} onChange={(event) => setReportSection(event.target.value as 'overview' | 'admin-audit')} className="min-w-52 rounded-md border border-slate-700 bg-ink px-3 py-2 text-white outline-none focus:border-cyber">
                <option value="overview">Learner workspace</option>
                <option value="admin-audit">Administrator audit report</option>
              </select>
              <button type="submit" disabled={isSubmitting} className="rounded-md border border-cyber/60 px-4 py-2 font-semibold text-cyber disabled:opacity-60">Open Section</button>
            </form>
            {trainingReport && <div className="mt-4 rounded border border-slate-800 p-3 text-sm"><p className="font-medium text-slate-100">{trainingReport.title}</p><p className="mt-1 text-slate-400">{trainingReport.summary}</p>{trainingReport.completionToken && <p className="mt-3 text-signal">Administrator function accessed. Completion value: <code>{trainingReport.completionToken}</code></p>}</div>}
          </div>
        )}
        {isStarted && !isCompleted && lab.challengeType === 'SSRF_MOCK_FETCH' && (
          <div className="mb-8 rounded-lg border border-slate-700 bg-ink/50 p-5">
            <h2 className="text-lg font-semibold text-white">Mock Fetch Service target</h2>
            <p className="mt-1 text-sm text-slate-400">This target dispatches only to fixed in-memory mock paths. It does not make network requests.</p>
            <form onSubmit={fetchMockResource} className="mt-4 flex flex-wrap gap-3">
              <input aria-label="Mock target URL" value={mockUrl} onChange={(event) => setMockUrl(event.target.value)} className="min-w-52 flex-1 rounded-md border border-slate-700 bg-ink px-3 py-2 font-mono text-white outline-none focus:border-cyber" />
              <button type="submit" disabled={isSubmitting} className="rounded-md border border-cyber/60 px-4 py-2 font-semibold text-cyber disabled:opacity-60">Fetch Mock Resource</button>
            </form>
            {mockFetchResponse && <div className="mt-4 rounded border border-slate-800 p-3 text-sm"><p className="font-mono text-signal">{mockFetchResponse.path} — {mockFetchResponse.status}</p><p className="mt-1 text-slate-400">{mockFetchResponse.message}</p>{mockFetchResponse.completionToken && <p className="mt-3 text-signal">Internal mock resource accessed. Completion value: <code>{mockFetchResponse.completionToken}</code></p>}</div>}
          </div>
        )}
        {isStarted && !isCompleted && lab.challengeType === 'SQLI_USER_DIRECTORY' && (
          <div className="mb-8 rounded-lg border border-slate-700 bg-ink/50 p-5">
            <h2 className="text-lg font-semibold text-white">Mock User Directory target</h2>
            <p className="mt-1 text-sm text-slate-400">This target uses fixed synthetic records and a deterministic query simulation; it never executes SQL.</p>
            <form onSubmit={searchDirectory} className="mt-4 flex flex-wrap gap-3">
              <input aria-label="Directory query" value={directoryQuery} onChange={(event) => setDirectoryQuery(event.target.value)} className="min-w-52 flex-1 rounded-md border border-slate-700 bg-ink px-3 py-2 font-mono text-white outline-none focus:border-cyber" />
              <button type="submit" disabled={isSubmitting} className="rounded-md border border-cyber/60 px-4 py-2 font-semibold text-cyber disabled:opacity-60">Search Directory</button>
            </form>
            {directoryPreview && <pre className="mt-4 overflow-x-auto rounded bg-black/30 p-3 text-xs text-signal">{directoryPreview}</pre>}
            {directoryRecords && <ul className="mt-4 space-y-2">{directoryRecords.map((record) => <li key={record.id} className="rounded border border-slate-800 p-3 text-sm"><p className="font-medium text-slate-100">{record.username} <span className="text-signal">#{record.id}</span></p><p className="mt-1 text-slate-400">{record.role}{record.status ? ` — ${record.status}` : ''}</p>{record.flag && <p className="mt-2 text-signal">Completion value: <code>{record.flag}</code></p>}</li>)}</ul>}
          </div>
        )}
        {isStarted && !isCompleted && lab.challengeType === 'FILE_UPLOAD_VALIDATION' && (
          <div className="mb-8 rounded-lg border border-slate-700 bg-ink/50 p-5">
            <h2 className="text-lg font-semibold text-white">Profile Image Upload target</h2>
            <p className="mt-1 text-sm text-slate-400">The browser picker is convenience only. This isolated target stores bytes separately and always serves them as downloads, never executable content.</p>
            <form onSubmit={uploadProfileImage} className="mt-4 flex flex-wrap gap-3">
              <input aria-label="Profile image file" type="file" accept="image/png,image/jpeg,image/gif" onChange={(event) => setProfileImage(event.target.files?.[0] ?? null)} className="min-w-52 flex-1 rounded-md border border-slate-700 bg-ink px-3 py-2 text-sm text-slate-300 file:mr-3 file:border-0 file:bg-cyan-950 file:px-3 file:py-1 file:text-cyber" />
              <button type="submit" disabled={isSubmitting} className="rounded-md border border-cyber/60 px-4 py-2 font-semibold text-cyber disabled:opacity-60">Upload Profile Image</button>
            </form>
            {profileUploadResult && <div className="mt-4 rounded border border-slate-800 p-3 text-sm"><p className="text-slate-300">{profileUploadResult.message}</p>{profileUploadResult.accepted && <p className="mt-1 font-mono text-signal">Stored: {profileUploadResult.filename} ({profileUploadResult.declaredMimeType})</p>}{profileUploadResult.completionToken && <p className="mt-3 text-signal">Mismatched content accepted. Completion value: <code>{profileUploadResult.completionToken}</code></p>}</div>}
          </div>
        )}
        {isStarted && !isCompleted && lab.challengeType === 'PATH_TRAVERSAL' && (
          <div className="mb-8 rounded-lg border border-slate-700 bg-ink/50 p-5">
            <h2 className="text-lg font-semibold text-white">Training File Viewer</h2>
            <p className="mt-1 text-sm text-slate-400">The viewer uses a fixed virtual file map. It never reads files from the CyberLab host.</p>
            <p className="mt-2 text-sm text-slate-400">Remediation: resolve paths against a fixed base directory, verify the canonical result remains inside that directory, and prefer mapping user choices to fixed file IDs.</p>
            <form onSubmit={readTrainingFileHandler} className="mt-4 flex flex-wrap gap-3">
              <input aria-label="Training file path" value={trainingFilePath} onChange={(event) => setTrainingFilePath(event.target.value)} placeholder="readme.txt" className="min-w-52 flex-1 rounded-md border border-slate-700 bg-ink px-3 py-2 font-mono text-white outline-none focus:border-cyber" />
              <button type="submit" disabled={isSubmitting} className="rounded-md border border-cyber/60 px-4 py-2 font-semibold text-cyber disabled:opacity-60">Read file</button>
            </form>
            {trainingFile && <div className="mt-4 rounded border border-slate-800 p-3 text-sm"><p className="font-mono text-xs text-slate-500">Resolved virtual path: {trainingFile.resolvedPath}</p><pre className="mt-2 whitespace-pre-wrap text-slate-200">{trainingFile.content}</pre>{trainingFile.completionToken && <p className="mt-3 text-signal">Synthetic restricted note found. Completion value: <code>{trainingFile.completionToken}</code></p>}</div>}
          </div>
        )}
        {isStarted && !isCompleted && lab.challengeType === 'SSTI_ALLOWLISTED' && (
          <div className="mb-8 rounded-lg border border-slate-700 bg-ink/50 p-5">
            <h2 className="text-lg font-semibold text-white">Training Template Preview</h2>
            <p className="mt-1 text-sm text-slate-400">The vulnerable preview interprets a tiny, allowlisted set of training expressions. The secure preview inserts the same input as literal text.</p>
            <form onSubmit={renderSstiPreviewHandler} className="mt-4 flex flex-wrap gap-3">
              <input aria-label="Template input" value={sstiInput} onChange={(event) => setSstiInput(event.target.value)} maxLength={200} className="min-w-52 flex-1 rounded-md border border-slate-700 bg-ink px-3 py-2 font-mono text-white outline-none focus:border-cyber" />
              <button type="submit" disabled={isSubmitting} className="rounded-md border border-cyber/60 px-4 py-2 font-semibold text-cyber disabled:opacity-60">Render comparison</button>
            </form>
            {sstiPreview && <div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded border border-red-400/30 p-3"><h3 className="text-sm font-semibold text-red-200">Vulnerable training behavior</h3><pre className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-200">{sstiPreview.vulnerableOutput}</pre></div><div className="rounded border border-signal/30 p-3"><h3 className="text-sm font-semibold text-signal">Secure behavior</h3><pre className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-200">{sstiPreview.secureOutput}</pre></div></div>}
            {sstiPreview?.completionToken && <p className="mt-4 rounded border border-signal/40 bg-signal/10 px-3 py-2 text-sm text-signal">Synthetic completion value: <code>{sstiPreview.completionToken}</code></p>}
            <div className="mt-4 rounded border border-slate-800 p-3 text-sm"><p className="font-semibold text-slate-200">Remediation</p><p className="mt-1 text-slate-400">Keep the template fixed and pass untrusted input as a value. Never concatenate user input into template source.</p><code className="mt-2 block break-all font-mono text-xs text-cyber">const safePreview = renderFixedTemplate(userInput);</code></div>
          </div>
        )}
        {isStarted && !isCompleted && lab.challengeType === 'BUSINESS_LOGIC_RACE_SIMULATOR' && (
          <div className="mb-8 rounded-lg border border-slate-700 bg-ink/50 p-5">
            <h2 className="text-lg font-semibold text-white">Synthetic Coupon Redemption</h2>
            <p className="mt-1 text-sm text-slate-400">Fixed training product: Desk Lamp, $40. Coupon SAVE-ONCE permits one redemption. All state is synthetic and private to this lab session.</p>
            <p className="mt-2 text-sm text-slate-400">In vulnerable mode, prepare both valid attempts before recording either. Each check snapshots the same current count. Input validation cannot prevent two valid requests from both relying on that stale result.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" disabled={isSubmitting} onClick={() => void runCouponSimulation('inspect')} className="rounded border border-slate-600 px-3 py-2 text-sm text-slate-200 disabled:opacity-60">Inspect store</button>
              <button type="button" disabled={isSubmitting} onClick={() => void runCouponSimulation('prepare', 'attempt-a')} className="rounded border border-cyber/60 px-3 py-2 text-sm text-cyber disabled:opacity-60">Prepare attempt A</button>
              <button type="button" disabled={isSubmitting} onClick={() => void runCouponSimulation('prepare', 'attempt-b')} className="rounded border border-cyber/60 px-3 py-2 text-sm text-cyber disabled:opacity-60">Prepare attempt B</button>
              <button type="button" disabled={isSubmitting} onClick={() => void runCouponSimulation('record', 'attempt-a')} className="rounded border border-signal/60 px-3 py-2 text-sm text-signal disabled:opacity-60">Record attempt A</button>
              <button type="button" disabled={isSubmitting} onClick={() => void runCouponSimulation('record', 'attempt-b')} className="rounded border border-signal/60 px-3 py-2 text-sm text-signal disabled:opacity-60">Record attempt B</button>
              <button type="button" disabled={isSubmitting} onClick={() => void runCouponSimulation('secure-batch')} className="rounded bg-cyber px-3 py-2 text-sm font-semibold text-ink disabled:opacity-60">Run secure two-attempt comparison</button>
            </div>
            <p className="mt-3 text-xs text-slate-500">The secure batch is a deterministic simulation: each request checks and updates one shared state transition before the next. It does not prove behavior of concurrent database transactions. Production systems need an atomic transaction, conditional update, or equivalent invariant enforcement.</p>
            {couponHistory.length > 0 && <ol aria-label="Coupon simulation results" className="mt-4 space-y-3">{couponHistory.map((entry, index) => <li key={`${entry.action}-${index}`} className="rounded border border-slate-800 p-3 text-sm">
              <p className="font-medium text-slate-100">{entry.action === 'secure-batch' ? 'Secure atomic comparison' : `Vulnerable workflow: ${entry.action}`}</p>
              <p className="mt-1 text-slate-400">{entry.coupon.code}: {entry.redemptionCount} / {entry.coupon.maximumRedemptions} redemptions; invariant {entry.invariantPreserved ? 'preserved' : 'violated'}.</p>
              {entry.outcomes.map((outcome) => <p key={`${index}-${outcome.attemptId}`} className="mt-1 text-slate-300">{outcome.attemptId}: {outcome.accepted ? 'accepted' : 'rejected'} — {outcome.message}</p>)}
              <p className="mt-2 text-xs text-slate-500">{entry.note}</p>
              {entry.completionReady && <p className="mt-2 text-signal">Both workflows are recorded. Type verify below to request server validation.</p>}
            </li>)}</ol>}
            <div className="mt-4 rounded border border-slate-800 p-3 text-sm"><p className="font-semibold text-slate-200">Why validation is not enough</p><p className="mt-1 text-slate-400">Both attempts use an allowed account, product, and coupon. The bug is the gap between checking eligibility and recording a use. An atomic conditional update must make the check and reservation one indivisible state change.</p></div>
          </div>
        )}
        {isStarted && !isCompleted && lab.challengeType === 'COMMAND_INJECTION_SIMULATOR' && (
          <div className="mb-8 rounded-lg border border-slate-700 bg-ink/50 p-5">
            <h2 className="text-lg font-semibold text-white">Synthetic Diagnostics Simulator</h2>
            <p className="mt-1 text-sm text-slate-400">This in-memory parser recognizes only fixed training tokens. It never launches a process or runs an operating-system command.</p>
            <form onSubmit={simulateCommandTarget} className="mt-4 space-y-3">
              <label className="block text-sm text-slate-200" htmlFor="command-mode">Simulation mode</label>
              <select id="command-mode" aria-label="Simulation mode" value={commandMode} onChange={(event) => setCommandMode(event.target.value as typeof commandMode)} className="w-full rounded-md border border-slate-700 bg-ink px-3 py-2 text-white">
                <option value="vulnerable">Vulnerable command-string mode</option>
                <option value="secure">Secure fixed-operation mode</option>
              </select>
              <label className="block text-sm text-slate-200" htmlFor="command-input">Additional training input</label>
              <input id="command-input" aria-label="Additional training input" value={commandInput} maxLength={120} onChange={(event) => setCommandInput(event.target.value)} placeholder="Try && audit" className="w-full rounded-md border border-slate-700 bg-ink px-3 py-2 font-mono text-white" />
              <button type="submit" disabled={isSubmitting} className="rounded-md border border-cyber/60 px-4 py-2 font-semibold text-cyber disabled:opacity-60">Run Synthetic Simulation</button>
            </form>
            <p className="mt-3 text-xs text-slate-500">The vulnerable mode strips semicolons but accepts the documented synthetic && audit token. Secure mode selects only status and displays the same input as data. This demonstrates why filtering syntax is weaker than avoiding command interpretation.</p>
            {commandSimulation && <div role="status" className="mt-4 space-y-3 rounded border border-slate-800 p-3 text-sm">
              <p className="font-medium text-slate-100">{commandSimulation.mode === 'vulnerable' ? 'Vulnerable mode' : 'Secure mode'} — {commandSimulation.filterApplied ? 'simple filter applied' : 'fixed operation selected'}</p>
              <ul className="space-y-2">{commandSimulation.operations.map((operation, index) => <li key={`${operation.operation}-${index}`}><span className="font-mono text-cyber">{operation.operation}</span><pre className="mt-1 whitespace-pre-wrap text-slate-300">{operation.output}</pre></li>)}</ul>
              <p className="text-slate-400">{commandSimulation.inputTreatment}</p>
              {commandSimulation.exerciseReady && <p className="text-signal">Both comparisons are recorded. Type verify below to request server validation.</p>}
            </div>}
            <div className="mt-4 rounded border border-slate-800 p-3 text-sm"><p className="font-semibold text-slate-200">Remediation</p><p className="mt-1 text-slate-400">Expose fixed diagnostic operations and pass typed arguments as data. Do not build command strings from user input or rely on character filtering.</p><code className="mt-2 block font-mono text-xs text-cyber">runDiagnostic('status', validatedOptions)</code></div>
          </div>
        )}
        {isStarted && !isCompleted && lab.challengeType === 'CORS_POLICY_SIMULATOR' && (
          <div className="mb-8 rounded-lg border border-slate-700 bg-ink/50 p-5">
            <h2 className="text-lg font-semibold text-white">CORS Policy Simulator</h2>
            <p className="mt-1 text-sm text-slate-400">This is a local policy calculation using synthetic response data. It does not send a request to the entered origin and does not test actual browser enforcement.</p>
            <p className="mt-2 text-sm text-slate-400">An origin is the scheme, host, and port together. The secure example trusts only <code>https://app.training.test</code>.</p>
            <form onSubmit={simulateCorsPolicy} className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-sm text-slate-300">Simulated Origin
                <input aria-label="Simulated Origin" value={corsOrigin} onChange={(event) => setCorsOrigin(event.target.value)} placeholder="https://attacker.training.test" className="mt-1 w-full rounded-md border border-slate-700 bg-ink px-3 py-2 font-mono text-white outline-none focus:border-cyber" />
              </label>
              <label className="text-sm text-slate-300">Actual request method
                <select aria-label="CORS request method" value={corsMethod} onChange={(event) => setCorsMethod(event.target.value as typeof corsMethod)} className="mt-1 w-full rounded-md border border-slate-700 bg-ink px-3 py-2 text-white outline-none focus:border-cyber">
                  <option>GET</option><option>POST</option><option>PUT</option><option>DELETE</option><option>PATCH</option>
                </select>
              </label>
              <label className="text-sm text-slate-300">Optional request header name
                <input aria-label="CORS request header name" value={corsHeaderName} onChange={(event) => setCorsHeaderName(event.target.value)} placeholder="X-Training-Client" className="mt-1 w-full rounded-md border border-slate-700 bg-ink px-3 py-2 font-mono text-white outline-none focus:border-cyber" />
              </label>
              <label className="text-sm text-slate-300">Request header value
                <input aria-label="CORS request header value" value={corsHeaderValue} onChange={(event) => setCorsHeaderValue(event.target.value)} maxLength={128} className="mt-1 w-full rounded-md border border-slate-700 bg-ink px-3 py-2 font-mono text-white outline-none focus:border-cyber" />
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-300 sm:col-span-2">
                <input aria-label="Include credentials" type="checkbox" checked={corsCredentials} onChange={(event) => setCorsCredentials(event.target.checked)} className="accent-cyber" />
                Simulate a credentialed request
              </label>
              <button type="submit" disabled={isSubmitting} className="w-fit rounded-md border border-cyber/60 px-4 py-2 font-semibold text-cyber disabled:opacity-60">Evaluate policies</button>
            </form>
            {corsSimulation && <div className="mt-5 space-y-4">
              <div className="rounded border border-slate-800 p-3 text-sm">
                <p className="font-medium text-slate-100">Origin result: {corsSimulation.origin.normalized ?? 'missing or malformed'}{corsSimulation.origin.trusted ? ' — trusted' : ' — untrusted'}</p>
                <p className="mt-1 text-slate-400">{corsSimulation.request.preflightRequired ? 'The browser would first send an OPTIONS preflight for this method/header combination.' : 'This request is modeled as a simple request and does not need a preflight.'}</p>
                <p className="mt-1 text-slate-400">The simulated server can process a simple request even when the browser will not expose its response to JavaScript. CORS is not authentication or authorization and does not block every cross-origin request.</p>
              </div>
              <div className="grid gap-3 xl:grid-cols-3">
                {([
                  ['permissive', 'Permissive origin reflection'],
                  ['allowlist', 'Explicit trusted-origin allowlist'],
                  ['wildcardWithCredentials', 'Wildcard with credentials enabled'],
                ] as const).map(([key, title]) => {
                  const policy = corsSimulation.policies[key];
                  return <section key={key} className="rounded border border-slate-800 p-3 text-sm">
                    <h3 className="font-semibold text-slate-100">{title}</h3>
                    <p className="mt-2 text-slate-400">Actual request processed by simulated server: <strong className="text-slate-200">{policy.actualRequestProcessed ? 'Yes' : 'No'}</strong></p>
                    {policy.preflightRequired && <p className="mt-1 text-slate-400">OPTIONS preflight allowed: <strong className="text-slate-200">{policy.preflightAllowed ? 'Yes' : 'No'}</strong></p>}
                    <p className="mt-2 text-slate-400">Simulated server response headers:</p>
                    <pre className="mt-1 whitespace-pre-wrap break-words rounded bg-black/30 p-2 text-xs text-cyber">{JSON.stringify(policy.actualRequestProcessed ? policy.responseHeaders : policy.preflightResponseHeaders ?? {}, null, 2)}</pre>
                    <p className="mt-2 text-slate-400">Simulated browser JavaScript can read response: <strong className={policy.browserCanReadResponse ? 'text-signal' : 'text-red-300'}>{policy.browserCanReadResponse ? 'Yes' : 'No'}</strong></p>
                    <p className="mt-1 text-slate-400">{policy.browserExplanation}</p>
                    {policy.syntheticResponse && <p className="mt-2 rounded bg-signal/10 p-2 text-signal">Synthetic data exposed to simulated script: {policy.syntheticResponse}</p>}
                  </section>;
                })}
              </div>
              {corsSimulation.completionToken && <p className="rounded border border-signal/40 bg-signal/10 px-3 py-2 text-sm text-signal">Required comparisons completed. Synthetic completion value: <code>{corsSimulation.completionToken}</code></p>}
            </div>}
            <div className="mt-4 rounded border border-slate-800 p-3 text-sm"><p className="font-semibold text-slate-200">Remediation</p><p className="mt-1 text-slate-400">Return CORS headers only for exact trusted origins, methods, and headers. Treat CORS as a browser response-sharing policy; enforce identity and permissions separately. A wildcard origin cannot be used to grant credentialed browser access.</p><code className="mt-2 block break-all font-mono text-xs text-cyber">if (trustedOrigins.has(origin)) response.setHeader('Access-Control-Allow-Origin', origin);</code></div>
          </div>
        )}
        {isStarted && !isCompleted && lab.challengeType === 'CSRF' && (
          <div className="mb-8 rounded-lg border border-slate-700 bg-ink/50 p-5">
            <h2 className="text-lg font-semibold text-white">Training victim profile</h2>
            <p className="mt-1 text-sm text-slate-400">
              This is isolated lab state only; it never changes your CyberLab account settings.
            </p>
            <p className="mt-2 text-sm text-slate-400">
              The local attacker simulator models a cross-origin form submission to this training
              target. It does not contact an outside site.
            </p>
            {csrfSettings ? (
              <div className="mt-4 rounded border border-slate-800 p-3 text-sm">
                <p className="font-medium text-slate-100">{csrfSettings.profileName}</p>
                <p className="mt-1 text-slate-300">
                  Email notifications:{' '}
                  <span
                    className={
                      csrfSettings.notificationsEnabled ? 'text-signal' : 'text-red-300'
                    }
                  >
                    {csrfSettings.notificationsEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </p>
                <p className="mt-1 text-slate-500">
                  Last change used a valid CSRF token:{' '}
                  {csrfSettings.lastChangeUsedValidCsrfToken ? 'Yes' : 'No'}
                </p>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-400">Loading the training victim settings…</p>
            )}
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={simulateCsrfNotificationChange}
                disabled={isSubmitting}
                className="rounded-md border border-red-400/60 px-4 py-2 font-semibold text-red-200 disabled:opacity-60"
              >
                Run attacker-request simulation
              </button>
              <button
                type="button"
                onClick={updateCsrfSettingsSecurely}
                disabled={isSubmitting}
                className="rounded-md border border-cyber/60 px-4 py-2 font-semibold text-cyber disabled:opacity-60"
              >
                Reset through protected request
              </button>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              The attacker simulation sends a form-style POST without an X-CSRF-Token header. The
              comparison control uses CyberLab’s normal token-protected request flow.
            </p>
            {csrfSettings?.completionToken && (
              <p className="mt-4 rounded border border-signal/40 bg-signal/10 px-3 py-2 text-sm text-signal">
                Unprotected state change detected. Completion value:{' '}
                <code>{csrfSettings.completionToken}</code>
              </p>
            )}
          </div>
        )}
        {isStarted && !isCompleted && (
          <form onSubmit={submitLab} className="space-y-3">
            <label htmlFor="submission" className="block text-sm font-medium text-slate-200">
              {lab.challengeType === 'COMMAND_INJECTION_SIMULATOR'
                ? 'Exercise verification'
                : lab.challengeType === 'BUSINESS_LOGIC_RACE_SIMULATOR'
                  ? 'Exercise verification'
                : hasInteractiveTarget(lab.challengeType)
                ? 'Flag submission'
                : 'Submission'}
            </label>
            <input
              id="submission"
              value={submission}
              onChange={(event) => setSubmission(event.target.value)}
              placeholder={
                lab.challengeType === 'COMMAND_INJECTION_SIMULATOR'
                  ? 'Type verify after both comparisons'
                  : lab.challengeType === 'BUSINESS_LOGIC_RACE_SIMULATOR'
                    ? 'Type verify after both workflows'
                  : hasInteractiveTarget(lab.challengeType)
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
