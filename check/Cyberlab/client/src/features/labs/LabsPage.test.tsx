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
});
