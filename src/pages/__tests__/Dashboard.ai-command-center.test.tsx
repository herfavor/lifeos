/** Regression coverage for the AI single-entry information architecture. */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

vi.spyOn(console, 'error').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});

describe('Dashboard AI entry', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('does not render a second AI composer on the home page', async () => {
    const { Dashboard } = await import('../../pages/Dashboard');
    render(
      <MemoryRouter initialEntries={['/']}>
        <Dashboard />
      </MemoryRouter>
    );

    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(screen.queryByTestId('ai-command-center')).not.toBeInTheDocument();
    expect(screen.queryByTestId('agent-composer-input')).not.toBeInTheDocument();
  }, 30000);
});
