import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('renders the CyberLab home page', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: /learn web security/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /cyberlab/i })).toBeInTheDocument();
  });
});
