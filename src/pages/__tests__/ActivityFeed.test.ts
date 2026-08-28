import { describe, expect, it } from 'vitest';
import type { ActivityEvent } from '../../stores/useActivityStore';
import { collapseNoisyActivities } from '../ActivityFeed';

function event(overrides: Partial<ActivityEvent>): ActivityEvent {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    type: 'updated',
    module: 'notes',
    entityId: 'note-1',
    entityTitle: '每日笔记',
    timestamp: '2026-08-26T10:00:00.000Z',
    ...overrides,
  };
}

describe('activity review aggregation', () => {
  it('collapses consecutive autosave-like updates for the same object', () => {
    const result = collapseNoisyActivities([
      event({ id: 'newer', timestamp: '2026-08-26T10:04:00.000Z' }),
      event({ id: 'older', timestamp: '2026-08-26T10:01:00.000Z' }),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].repeatCount).toBe(2);
  });

  it('keeps meaningful events and different objects separate', () => {
    const result = collapseNoisyActivities([
      event({ id: 'done', type: 'completed', module: 'tasks', entityId: 'task-1' }),
      event({ id: 'note', entityId: 'note-2' }),
    ]);
    expect(result).toHaveLength(2);
  });
});
