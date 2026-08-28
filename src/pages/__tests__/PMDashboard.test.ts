import { describe, expect, it } from 'vitest';
import { getProjectQuickAddPath } from '../../utils/projectTaskDeepLink';

describe('Project Center next-step action', () => {
  it('creates a task deep link with the selected project and creation intent', () => {
    expect(getProjectQuickAddPath('project / 1')).toBe('/tasks?tab=tasks&project=project%20%2F%201&new=1');
  });
});
