import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { About } from '../About';
import { Privacy } from '../Privacy';

vi.mock('../../utils/buildInfo', () => ({
  BUILD_HASH: 'test-hash',
  formatBuildTimestamp: () => '测试构建',
}));

describe('About and privacy routes', () => {
  it('renders About as normal in-app content instead of a modal overlay', () => {
    const { container } = render(
      <MemoryRouter>
        <About />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'LifeOS' })).toBeInTheDocument();
    expect(screen.getByText('本地优先')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(container.querySelector('.fixed.inset-0')).toBeNull();
  });

  it('renders Privacy as normal in-app content with a settings path', () => {
    const { container } = render(
      <MemoryRouter>
        <Privacy />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: '你的数据属于你' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '前往备份' })).toHaveAttribute('href', '/settings?tab=backup');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(container.querySelector('.fixed.inset-0')).toBeNull();
  });
});
