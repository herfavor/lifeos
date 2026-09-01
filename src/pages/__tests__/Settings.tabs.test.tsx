/** Settings tabs must remain reachable through their single URL-backed navigation. */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

vi.mock('../../utils/buildInfo', () => ({
  BUILD_HASH: 'test-build',
  BUILD_TIMESTAMP: '2026-01-01T00:00:00.000Z',
  formatBuildTimestamp: () => 'test timestamp',
}));

vi.mock('../../widgets/Settings/AboutSettings', () => ({
  AboutSettings: () => <h2>关于</h2>,
}));

import { Settings } from '../Settings';

describe('Settings tab navigation', () => {
  beforeEach(() => localStorage.clear());

  it.each([
    ['个人与应用', /个人资料（仅存本机）/],
    ['外观', /^外观$/],
    ['工作区', /每日笔记/],
    ['通知', /通知偏好/],
    ['AI 提供商', /AI 提供商/],
    ['导入与导出', /导入数据/],
    ['备份', /快捷操作/],
    ['系统与关于', /键盘快捷键/],
  ] as const)('renders %s after selecting its tab', async (tabLabel, expectedContent) => {
    render(
      <MemoryRouter initialEntries={['/settings?tab=general']}>
        <Settings />
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByRole('tab', { name: tabLabel }));
    expect(await screen.findByRole('heading', { name: expectedContent })).toBeInTheDocument();
  });
});
