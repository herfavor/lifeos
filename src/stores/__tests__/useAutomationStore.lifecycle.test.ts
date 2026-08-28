import { beforeEach, describe, expect, it } from 'vitest';
import { useAutomationStore } from '../useAutomationStore';

const ruleInput = {
  name: '生命周期规则',
  trigger: { type: 'task.created' as const },
  conditions: [],
  actions: [{ type: 'add_tag' as const, config: { tag: '测试' } }],
};

describe('useAutomationStore rule lifecycle', () => {
  beforeEach(() => {
    useAutomationStore.setState({ rules: [], executionLogs: [] });
  });

  it('does not execute archived rules and can restore them', () => {
    useAutomationStore.getState().addRule(ruleInput);
    const id = useAutomationStore.getState().rules[0].id;

    useAutomationStore.getState().archiveRule(id);
    expect(useAutomationStore.getState().getRulesByTrigger('task.created')).toHaveLength(0);
    expect(useAutomationStore.getState().rules[0].archivedAt).toBeTruthy();

    useAutomationStore.getState().restoreRule(id);
    expect(useAutomationStore.getState().rules[0].archivedAt).toBeUndefined();
  });

  it('keeps deleted rules recoverable until permanent deletion', () => {
    useAutomationStore.getState().addRule(ruleInput);
    const id = useAutomationStore.getState().rules[0].id;

    useAutomationStore.getState().deleteRule(id);
    expect(useAutomationStore.getState().rules[0].deletedAt).toBeTruthy();
    expect(useAutomationStore.getState().getRulesByTrigger('task.created')).toHaveLength(0);

    useAutomationStore.getState().permanentlyDeleteRule(id);
    expect(useAutomationStore.getState().rules).toHaveLength(0);
  });
});
