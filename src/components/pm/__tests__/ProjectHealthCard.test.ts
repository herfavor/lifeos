import { describe, expect, it } from 'vitest';
import type { Task } from '../../../types';
import { calculateHealthMetrics } from '../ProjectHealthCard';

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task',
    title: '任务',
    description: '',
    status: 'todo',
    created: '2026-08-26T00:00:00.000Z',
    startDate: null,
    dueDate: null,
    priority: 'medium',
    tags: [],
    projectIds: [],
    ...overrides,
  };
}

describe('calculateHealthMetrics', () => {
  it('returns unknown metrics when there is no evidence', () => {
    expect(calculateHealthMetrics([])).toEqual({
      spi: null,
      onTimeRate: null,
      scopeChange: null,
      utilization: null,
      overallHealth: null,
      trend: null,
    });
  });

  it('does not invent health from an unplanned task', () => {
    const metrics = calculateHealthMetrics([task()]);
    expect(metrics.spi).toBeNull();
    expect(metrics.onTimeRate).toBeNull();
    expect(metrics.overallHealth).toBeNull();
  });
});
