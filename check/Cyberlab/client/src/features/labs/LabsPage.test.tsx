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
};

const { api } = vi.hoisted(() => ({
  api: {
    labs: vi.fn(),
    lab: vi.fn(),
    labProgress: vi.fn(),
    startLab: vi.fn(),
    labSession: vi.fn(),
    submitLab: vi.fn(),
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
    progress: { id: 'progress-1', labId: lab.id, status: 'IN_PROGRESS', startedAt: '2026-01-01', completedAt: null, lab },
    session: { id: 'session-1', labId: lab.id, startedAt: '2026-01-01', lastActivityAt: '2026-01-01', completedAt: null, status: 'ACTIVE', lab },
  });
  api.labSession.mockResolvedValue({ session: { id: 'session-1', labId: lab.id, startedAt: '2026-01-01', lastActivityAt: '2026-01-01', completedAt: null, status: 'ACTIVE', lab } });
  api.submitLab.mockResolvedValue({
    success: true, completed: true, message: 'Submission accepted.',
    session: { id: 'session-1', labId: lab.id, startedAt: '2026-01-01', lastActivityAt: '2026-01-01', completedAt: '2026-01-01', status: 'COMPLETED', lab },
    progress: { id: 'progress-1', labId: lab.id, status: 'COMPLETED', startedAt: '2026-01-01', completedAt: '2026-01-01', lab },
  });
  api.completeLab.mockResolvedValue({
    progress: { id: 'progress-1', labId: lab.id, status: 'COMPLETED', startedAt: '2026-01-01', completedAt: '2026-01-01', lab },
  });
});

describe('lab pages', () => {
  it('renders labs, backend progress, and filters', async () => {
    render(<MemoryRouter><LabsPage /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Labs' })).toBeInTheDocument();
    expect(screen.getByText('SQL Injection Basics')).toBeInTheDocument();
    expect(screen.getByText('Not Started')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Search labs'), { target: { value: 'missing' } });
    expect(screen.getByText('No labs match the selected filters.')).toBeInTheDocument();
  });

  it('loads a lab detail page and updates progress through the API', async () => {
    render(
      <MemoryRouter initialEntries={['/labs/sql-injection-basics']}>
        <Routes><Route path="/labs/:slug" element={<LabDetailPage />} /></Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByRole('heading', { name: 'SQL Injection Basics' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Start Lab' }));
    await waitFor(() => expect(api.startLab).toHaveBeenCalledWith('sql-injection-basics'));
    fireEvent.change(screen.getByLabelText('Submission'), { target: { value: 'CYBERLAB_READY' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit Attempt' }));
    await waitFor(() => expect(api.submitLab).toHaveBeenCalledWith('sql-injection-basics', { confirmation: 'CYBERLAB_READY' }));
    expect(await screen.findByText('Completed — 100 points')).toBeInTheDocument();
  });
});
