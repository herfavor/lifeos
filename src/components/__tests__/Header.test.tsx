import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Header } from '../Header';
import { useThemeStore } from '../../stores/useThemeStore';

// Helper to render with router context
const renderWithRouter = (ui: React.ReactElement, { route = '/' } = {}) => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      {ui}
    </MemoryRouter>
  );
};

describe('Header', () => {
  beforeEach(() => {
    // Reset theme to dark mode before each test
    useThemeStore.setState({ mode: 'dark' });
  });

  it('should render branding', () => {
    renderWithRouter(<Header />);

    expect(screen.getByText('本地优先的个人管理平台')).toBeInTheDocument();
  });

  it('should render logo image', () => {
    renderWithRouter(<Header />);

    const logo = screen.getByAltText('LifeOS Logo');
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute('src', '/images/logos/lifeos-logo-white.svg');
  });

  it('should render theme toggle button', () => {
    renderWithRouter(<Header />);

    const toggleButton = screen.getByTitle(/切换到/);
    expect(toggleButton).toBeInTheDocument();
  });

  it('should show sun icon in dark mode', () => {
    useThemeStore.setState({ mode: 'dark' });
    renderWithRouter(<Header />);

    const toggleButton = screen.getByTitle('切换到浅色模式');
    expect(toggleButton).toBeInTheDocument();
    expect(toggleButton.querySelector('svg')).toBeInTheDocument();
  });

  it('should show moon icon in light mode', () => {
    useThemeStore.setState({ mode: 'light' });
    renderWithRouter(<Header />);

    const toggleButton = screen.getByTitle('切换到深色模式');
    expect(toggleButton).toBeInTheDocument();
    expect(toggleButton.querySelector('svg')).toBeInTheDocument();
  });

  it('should toggle theme when button is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Header />);

    // Start in dark mode
    expect(useThemeStore.getState().mode).toBe('dark');

    const toggleButton = screen.getByTitle('切换到浅色模式');
    await user.click(toggleButton);

    // Should now be in light mode
    expect(useThemeStore.getState().mode).toBe('light');
  });

  it('should toggle theme multiple times', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    // Start: dark mode
    expect(useThemeStore.getState().mode).toBe('dark');

    // Click 1: dark -> light
    let toggleButton = screen.getByTitle('切换到浅色模式');
    await user.click(toggleButton);
    expect(useThemeStore.getState().mode).toBe('light');

    // Rerender to reflect state change
    rerender(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    // Click 2: light -> dark
    toggleButton = screen.getByTitle('切换到深色模式');
    await user.click(toggleButton);
    expect(useThemeStore.getState().mode).toBe('dark');
  });

  it('should have correct header styling classes', () => {
    const { container } = renderWithRouter(<Header />);

    const header = container.querySelector('header');
    expect(header).toHaveClass('sticky');
    expect(header).toHaveClass('top-0');
    expect(header).toHaveClass('z-50');
  });

  it('should render navigation links', () => {
    renderWithRouter(<Header />);

    expect(screen.getByText('首页')).toBeInTheDocument();
    expect(screen.getByText('笔记')).toBeInTheDocument();
    expect(screen.getByText('日程')).toBeInTheDocument();
    expect(screen.getByText('任务')).toBeInTheDocument();
    expect(screen.getByText('设置')).toBeInTheDocument();
  });
});
