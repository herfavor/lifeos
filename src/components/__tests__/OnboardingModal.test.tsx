import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { OnboardingModal } from '../OnboardingModal';
import { useSettingsStore } from '../../stores/useSettingsStore';

vi.mock('../../utils/buildInfo', () => ({
  BUILD_HASH: 'test-hash',
  BUILD_TIMESTAMP: '2026-01-01T00:00:00.000Z',
}));

const LocationProbe = () => {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}{location.search}</output>;
};

describe('OnboardingModal', () => {
  beforeEach(() => {
    useSettingsStore.setState({ onboardingComplete: false, displayName: '' });
  });

  it('teaches one core workflow and presents AI as a standalone destination', () => {
    render(
      <MemoryRouter>
        <OnboardingModal isOpen onClose={vi.fn()} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: '下一步' }));

    expect(screen.getByText('1. 收集')).toBeInTheDocument();
    expect(screen.getByText('2. 安排')).toBeInTheDocument();
    expect(screen.getByText('3. 专注')).toBeInTheDocument();
    expect(screen.getByText('4. 沉淀与回顾')).toBeInTheDocument();
    expect(screen.getByText(/AI 是独立助手/)).toBeInTheDocument();
  }, 15_000);

  it('finishes into a real creation flow instead of leaving the user on a dead CTA', () => {
    const onClose = vi.fn();
    render(
      <MemoryRouter initialEntries={['/']}>
        <OnboardingModal isOpen onClose={onClose} />
        <LocationProbe />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    fireEvent.click(screen.getByRole('button', { name: /创建你的第一个任务/ }));

    expect(screen.getByTestId('location')).toHaveTextContent('/tasks?tab=inbox');
    expect(onClose).toHaveBeenCalled();
    expect(useSettingsStore.getState().onboardingComplete).toBe(true);
  }, 15_000);
});
