import { describe, expect, it } from 'vitest';
import { getQuickAddProjectId } from '../../utils/projectTaskDeepLink';

describe('Kanban project creation deep link', () => {
  it('consumes a project only when the URL requests a new task', () => {
    expect(getQuickAddProjectId(new URLSearchParams('tab=tasks&project=project-1&new=1'))).toBe('project-1');
    expect(getQuickAddProjectId(new URLSearchParams('tab=tasks&project=project-1'))).toBeUndefined();
  });
});
