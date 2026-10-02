import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const lab = {
  id: 'lab-1',
  slug: 'sql-injection-basics',
  title: 'SQL Injection Basics',
  description: 'Placeholder metadata only.',
  category: 'INJECTION' as const,
  difficulty: 'BEGINNER' as const,
  estimatedMinutes: 30,
  points: 100,
  objective: 'Understand unsafe query construction.',
  instructions: 'Use the Product Search target.',
  target: 'Product Search',
  challengeType: 'SQL_INJECTION_PRODUCT_SEARCH',
  hints: ['Inspect the query preview.', 'Try a tautology.'],
};

const { api } = vi.hoisted(() => ({
  api: {
    labs: vi.fn(),
    lab: vi.fn(),
    labProgress: vi.fn(),
    startLab: vi.fn(),
    labSession: vi.fn(),
    submitLab: vi.fn(),
    searchProducts: vi.fn(),
    searchFeedback: vi.fn(),
    trainingProfile: vi.fn(),
    trainingLogin: vi.fn(),
    trainingReport: vi.fn(),
    fetchMockResource: vi.fn(),
    searchDirectory: vi.fn(),
    completeLab: vi.fn(),
  },
}));

vi.mock('../../lib/api', () => ({ api, ApiError: class ApiError extends Error {} }));

import { LabDetailPage } from './LabDetailPage';
import { LabsPage } from './LabsPage';

beforeEach(() => {
  api.labs.mockResolvedValue({ labs: [lab] });
  api.lab.mockResolvedValue({ lab });
  api.labProgress.mockResolvedValue({ progress: [] });
  api.startLab.mockResolvedValue({
    progress: {
      id: 'progress-1',
      labId: lab.id,
      status: 'IN_PROGRESS',
      startedAt: '2026-01-01',
      completedAt: null,
      lab,
    },
    session: {
      id: 'session-1',
      labId: lab.id,
      startedAt: '2026-01-01',
      lastActivityAt: '2026-01-01',
      completedAt: null,
      status: 'ACTIVE',
      lab,
    },
  });
  api.labSession.mockResolvedValue({
    session: {
      id: 'session-1',
      labId: lab.id,
      startedAt: '2026-01-01',
      lastActivityAt: '2026-01-01',
      completedAt: null,
      status: 'ACTIVE',
      lab,
    },
  });
  api.submitLab.mockResolvedValue({
    success: true,
    completed: true,
    message: 'Submission accepted.',
    session: {
      id: 'session-1',
      labId: lab.id,
      startedAt: '2026-01-01',
      lastActivityAt: '2026-01-01',
      completedAt: '2026-01-01',
      status: 'COMPLETED',
      lab,
    },
    progress: {
      id: 'progress-1',
      labId: lab.id,
      status: 'COMPLETED',
      startedAt: '2026-01-01',
      completedAt: '2026-01-01',
      lab,
    },
  });
  api.searchProducts.mockResolvedValue({
    queryPreview: "SELECT name FROM products WHERE name LIKE '%' OR '1'='1%'",
    results: [
      {
        name: 'Internal wholesale reconciliation note',
        description: 'Escalation flag: CYBERLAB{product_search_tautology}',
        price: 'Not for sale',
        internal: true,
      },
    ],
  });
  api.searchFeedback.mockResolvedValue({
    document: '<h1>Feedback Search</h1><p>hello</p>',
    completionToken: 'XSS_PREVIEW_CONFIRMED',
  });
  api.trainingProfile.mockResolvedValue({
    profile: { id: 102, displayName: 'Jordan Training', role: 'Support coordinator', bio: 'Synthetic restricted profile.', owner: 'OTHER_TRAINING_USER' },
    completionToken: 'IDOR_PROFILE_ACCESS_CONFIRMED',
  });
  api.trainingLogin.mockResolvedValue({ authenticated: true, role: 'learner', message: 'Synthetic training target accepted the login attempt.', completionToken: 'AUTH_BYPASS_CONFIRMED' });
  api.trainingReport.mockResolvedValue({ section: 'admin-audit', title: 'Administrator audit report', summary: 'Synthetic audit data.', completionToken: 'BROKEN_FUNCTION_ACCESS_CONFIRMED' });
  api.fetchMockResource.mockResolvedValue({ path: '/internal/admin-config', status: 'ok', message: 'Synthetic internal configuration loaded.', completionToken: 'SSRF_INTERNAL_CONFIG_CONFIRMED' });
  api.searchDirectory.mockResolvedValue({ queryPreview: "SELECT id, username, role FROM mock_users WHERE username = 'alice'", records: [{ id: 3, username: 'auditor', role: 'admin', status: 'internal-review', flag: 'SQLI_DIRECTORY_ACCESS_CONFIRMED' }] });
  api.completeLab.mockResolvedValue({
    progress: {
      id: 'progress-1',
      labId: lab.id,
      status: 'COMPLETED',
      startedAt: '2026-01-01',
      completedAt: '2026-01-01',
      lab,
    },
  });
});

describe('lab pages', () => {
  it('renders labs, backend progress, and filters', async () => {
    render(
      <MemoryRouter>
        <LabsPage />
      </MemoryRouter>,
    );
    expect(await screen.findByRole('heading', { name: 'Labs' })).toBeInTheDocument();
    expect(screen.getByText('SQL Injection Basics')).toBeInTheDocument();
    expect(screen.getByText('Not Started')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Search labs'), { target: { value: 'missing' } });
    expect(screen.getByText('No labs match the selected filters.')).toBeInTheDocument();
  });

  it('loads a lab detail page and updates progress through the API', async () => {
    render(
      <MemoryRouter initialEntries={['/labs/sql-injection-basics']}>
        <Routes>
          <Route path="/labs/:slug" element={<LabDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(
      await screen.findByRole('heading', { name: 'SQL Injection Basics' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Start Lab' }));
    await waitFor(() => expect(api.startLab).toHaveBeenCalledWith('sql-injection-basics'));
    expect(screen.getByText('Inspect the query preview.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Product search'), {
      target: { value: "' OR '1'='1'--" },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() =>
      expect(api.searchProducts).toHaveBeenCalledWith('sql-injection-basics', "' OR '1'='1'--"),
    );
    expect(await screen.findByText(/Escalation flag/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Flag submission'), {
      target: { value: 'CYBERLAB{product_search_tautology}' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Submit Attempt' }));
    await waitFor(() =>
      expect(api.submitLab).toHaveBeenCalledWith('sql-injection-basics', {
        flag: 'CYBERLAB{product_search_tautology}',
      }),
    );
    expect(await screen.findByText('Completed — 100 points')).toBeInTheDocument();
  });

  it('renders the XSS target in a sandboxed iframe and submits its completion value', async () => {
    const xssLab = { ...lab, slug: 'xss-fundamentals', title: 'Reflected XSS Basics', challengeType: 'XSS_FEEDBACK_SEARCH' };
    api.lab.mockResolvedValue({ lab: xssLab });
    render(<MemoryRouter initialEntries={['/labs/xss-fundamentals']}><Routes><Route path="/labs/:slug" element={<LabDetailPage />} /></Routes></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Reflected XSS Basics' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Start Lab' }));
    fireEvent.change(await screen.findByLabelText('Feedback search'), { target: { value: '<script>/* training */</script>' } });
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    await waitFor(() => expect(api.searchFeedback).toHaveBeenCalledWith('xss-fundamentals', '<script>/* training */</script>'));
    expect(screen.getByTitle('Isolated Feedback Search preview')).toHaveAttribute('sandbox', 'allow-scripts');
    fireEvent.change(screen.getByLabelText('Flag submission'), { target: { value: 'XSS_PREVIEW_CONFIRMED' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit Attempt' }));
    await waitFor(() => expect(api.submitLab).toHaveBeenCalledWith('xss-fundamentals', { flag: 'XSS_PREVIEW_CONFIRMED' }));
  });

  it('renders the IDOR target and submits its server-provided completion value', async () => {
    const idorLab = { ...lab, slug: 'idor-fundamentals', title: 'Profile Access — IDOR Basics', category: 'ACCESS_CONTROL' as const, challengeType: 'IDOR_PROFILE_ACCESS' };
    api.lab.mockResolvedValue({ lab: idorLab });
    render(<MemoryRouter initialEntries={['/labs/idor-fundamentals']}><Routes><Route path="/labs/:slug" element={<LabDetailPage />} /></Routes></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Profile Access — IDOR Basics' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Start Lab' }));
    fireEvent.change(await screen.findByLabelText('Profile ID'), { target: { value: '102' } });
    fireEvent.click(screen.getByRole('button', { name: 'View Profile' }));
    await waitFor(() => expect(api.trainingProfile).toHaveBeenCalledWith('idor-fundamentals', '102'));
    expect(await screen.findByText('Jordan Training')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Flag submission'), { target: { value: 'IDOR_PROFILE_ACCESS_CONFIRMED' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit Attempt' }));
    await waitFor(() => expect(api.submitLab).toHaveBeenCalledWith('idor-fundamentals', { flag: 'IDOR_PROFILE_ACCESS_CONFIRMED' }));
  });

  it('renders the synthetic authentication target and submits its completion value', async () => {
    const authLab = { ...lab, slug: 'authentication-bypass-basics', title: 'Authentication Bypass Basics', category: 'AUTHENTICATION' as const, challengeType: 'AUTHENTICATION_BYPASS' };
    api.lab.mockResolvedValue({ lab: authLab });
    render(<MemoryRouter initialEntries={['/labs/authentication-bypass-basics']}><Routes><Route path="/labs/:slug" element={<LabDetailPage />} /></Routes></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Authentication Bypass Basics' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Start Lab' }));
    fireEvent.change(await screen.findByLabelText('Training username'), { target: { value: 'trainee' } });
    fireEvent.change(screen.getByLabelText('Training password'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: 'Log In to Training Target' }));
    await waitFor(() => expect(api.trainingLogin).toHaveBeenCalledWith('authentication-bypass-basics', { username: 'trainee', password: 'wrong' }));
    expect(await screen.findByText(/AUTH_BYPASS_CONFIRMED/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Flag submission'), { target: { value: 'AUTH_BYPASS_CONFIRMED' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit Attempt' }));
    await waitFor(() => expect(api.submitLab).toHaveBeenCalledWith('authentication-bypass-basics', { flag: 'AUTH_BYPASS_CONFIRMED' }));
  });

  it('renders the isolated function authorization target and submits its completion value', async () => {
    const accessLab = { ...lab, slug: 'broken-access-control', title: 'Broken Function-Level Authorization', category: 'ACCESS_CONTROL' as const, challengeType: 'BROKEN_FUNCTION_ACCESS' };
    api.lab.mockResolvedValue({ lab: accessLab });
    render(<MemoryRouter initialEntries={['/labs/broken-access-control']}><Routes><Route path="/labs/:slug" element={<LabDetailPage />} /></Routes></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Broken Function-Level Authorization' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Start Lab' }));
    fireEvent.change(await screen.findByLabelText('Workspace section'), { target: { value: 'admin-audit' } });
    fireEvent.click(screen.getByRole('button', { name: 'Open Section' }));
    await waitFor(() => expect(api.trainingReport).toHaveBeenCalledWith('broken-access-control', 'admin-audit'));
    expect(await screen.findByText(/BROKEN_FUNCTION_ACCESS_CONFIRMED/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Flag submission'), { target: { value: 'BROKEN_FUNCTION_ACCESS_CONFIRMED' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit Attempt' }));
    await waitFor(() => expect(api.submitLab).toHaveBeenCalledWith('broken-access-control', { flag: 'BROKEN_FUNCTION_ACCESS_CONFIRMED' }));
  });

  it('renders the isolated mock fetch target, reports rejected input, and submits its completion value', async () => {
    const ssrfLab = { ...lab, slug: 'ssrf', title: 'Server-Side Request Forgery', category: 'WEB_SECURITY' as const, challengeType: 'SSRF_MOCK_FETCH' };
    api.lab.mockResolvedValue({ lab: ssrfLab });
    api.fetchMockResource.mockRejectedValueOnce(new Error('Only predefined in-memory mock paths are allowed.'));
    render(<MemoryRouter initialEntries={['/labs/ssrf']}><Routes><Route path="/labs/:slug" element={<LabDetailPage />} /></Routes></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Server-Side Request Forgery' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Start Lab' }));
    fireEvent.change(await screen.findByLabelText('Mock target URL'), { target: { value: 'http://localhost:3000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Fetch Mock Resource' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to fetch the mock target.');
    fireEvent.change(screen.getByLabelText('Mock target URL'), { target: { value: '/internal/admin-config' } });
    fireEvent.click(screen.getByRole('button', { name: 'Fetch Mock Resource' }));
    await waitFor(() => expect(api.fetchMockResource).toHaveBeenLastCalledWith('ssrf', '/internal/admin-config'));
    expect(await screen.findByText(/SSRF_INTERNAL_CONFIG_CONFIRMED/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Flag submission'), { target: { value: 'SSRF_INTERNAL_CONFIG_CONFIRMED' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit Attempt' }));
    await waitFor(() => expect(api.submitLab).toHaveBeenCalledWith('ssrf', { flag: 'SSRF_INTERNAL_CONFIG_CONFIRMED' }));
  });

  it('renders the isolated SQLi directory target, reports rejected input, and submits its completion value', async () => {
    const sqliLab = { ...lab, slug: 'sqli', title: 'SQL Injection', category: 'INJECTION' as const, challengeType: 'SQLI_USER_DIRECTORY' };
    api.lab.mockResolvedValue({ lab: sqliLab });
    api.searchDirectory.mockRejectedValueOnce(new Error('Rejected mock query.'));
    render(<MemoryRouter initialEntries={['/labs/sqli']}><Routes><Route path="/labs/:slug" element={<LabDetailPage />} /></Routes></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'SQL Injection' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Start Lab' }));
    fireEvent.change(await screen.findByLabelText('Directory query'), { target: { value: 'DROP TABLE mock_users' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search Directory' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to search the mock directory.');
    fireEvent.change(screen.getByLabelText('Directory query'), { target: { value: "alice' OR '1'='1" } });
    fireEvent.click(screen.getByRole('button', { name: 'Search Directory' }));
    await waitFor(() => expect(api.searchDirectory).toHaveBeenLastCalledWith('sqli', "alice' OR '1'='1"));
    expect(await screen.findByText('auditor')).toBeInTheDocument();
    expect(screen.getByText(/SQLI_DIRECTORY_ACCESS_CONFIRMED/)).toBeInTheDocument();
    api.submitLab.mockResolvedValueOnce({
      success: false, completed: false, message: 'That completion value is not correct.',
      session: { id: 'session-1', labId: sqliLab.id, startedAt: '2026-01-01', lastActivityAt: '2026-01-01', completedAt: null, status: 'ACTIVE', lab: sqliLab },
    });
    fireEvent.change(screen.getByLabelText('Flag submission'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit Attempt' }));
    await waitFor(() => expect(api.submitLab).toHaveBeenCalledWith('sqli', { flag: 'wrong' }));
    fireEvent.change(screen.getByLabelText('Flag submission'), { target: { value: 'SQLI_DIRECTORY_ACCESS_CONFIRMED' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit Attempt' }));
    await waitFor(() => expect(api.submitLab).toHaveBeenCalledWith('sqli', { flag: 'SQLI_DIRECTORY_ACCESS_CONFIRMED' }));
  });
});
