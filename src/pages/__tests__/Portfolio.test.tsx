import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Portfolio } from '../Portfolio';
import { useProjectContextStore } from '../../stores/useProjectContextStore';
import { useKanbanStore } from '../../stores/useKanbanStore';
import { useTimeTrackingStore } from '../../stores/useTimeTrackingStore';

describe('Portfolio', () => {
  const renderPortfolio = () => render(
    <MemoryRouter>
      <Portfolio />
    </MemoryRouter>
  );

  beforeEach(() => {
    useProjectContextStore.setState({ projects: [], activeProjectIds: [] });
    useKanbanStore.setState({ tasks: [] });
    useTimeTrackingStore.setState({ entries: [] });
  });

  it('renders an empty project portfolio without an unstable store snapshot', () => {
    renderPortfolio();
    expect(screen.getByText('组合视图')).toBeInTheDocument();
    expect(screen.getByText(/0 个任务总计/)).toBeInTheDocument();
  });

  it('does not mark a project with no task samples as unhealthy', () => {
    useProjectContextStore.setState({
      projects: [{
        id: 'empty',
        name: '空项目',
        parentId: null,
        color: '#3b82f6',
        createdAt: '2026-08-26T00:00:00.000Z',
        updatedAt: '2026-08-26T00:00:00.000Z',
      }],
      activeProjectIds: [],
    });

    renderPortfolio();
    expect(screen.getByTitle('数据不足')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.queryByText(/存在风险/)).not.toBeInTheDocument();
  });
});
