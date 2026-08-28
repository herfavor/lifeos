/**
 * Agent tool registry tests: schema completeness, validation outcomes,
 * and zh-CN card summaries.
 */
import { describe, it, expect } from 'vitest';
import {
  AGENT_TOOLS,
  AGENT_TOOL_IDS,
  agentParamSchemas,
  validateRawAction,
  buildActionSummary,
} from '../tools';

describe('AGENT_TOOLS registry', () => {
  it('defines a schema for every registered tool id', () => {
    for (const id of AGENT_TOOL_IDS) {
      expect(agentParamSchemas[id]).toBeDefined();
      expect(AGENT_TOOLS[id].doc.length).toBeGreaterThan(5);
    }
  });

  it('marks mutation tools as write and query tools as read', () => {
    expect(AGENT_TOOLS.create_task.risk).toBe('write');
    expect(AGENT_TOOLS.delete_event.risk).toBe('write');
    expect(AGENT_TOOLS.list_tasks.risk).toBe('read');
    expect(AGENT_TOOLS.list_notes.risk).toBe('read');
    expect(AGENT_TOOLS.list_projects.risk).toBe('read');
    expect(AGENT_TOOLS.create_automation.risk).toBe('write');
  });
});

describe('validateRawAction', () => {
  it('accepts a valid create_task action and fills defaults', () => {
    const result = validateRawAction({
      tool: 'create_task',
      params: { title: '写周报' },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.action.tool).toBe('create_task');
      expect(result.action.params.title).toBe('写周报');
    }
  });

  it('rejects an unknown tool', () => {
    const result = validateRawAction({ tool: 'format_disk' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('未知工具');
  });

  it('rejects malformed dates and times', () => {
    const badDate = validateRawAction({
      tool: 'create_task',
      params: { title: 'x', dueDate: '明天' },
    });
    expect(badDate.ok).toBe(false);

    const badTime = validateRawAction({
      tool: 'create_event',
      params: { date: '2026-05-01', title: '会', startTime: '25:00' },
    });
    expect(badTime.ok).toBe(false);
  });

  it('requires exactly one of taskId / titleQuery', () => {
    const neither = validateRawAction({ tool: 'delete_task', params: {} });
    expect(neither.ok).toBe(false);

    const both = validateRawAction({
      tool: 'delete_task',
      params: { taskId: '1', titleQuery: 'x' },
    });
    expect(both.ok).toBe(false);
  });

  it('requires endTime to come with startTime', () => {
    const result = validateRawAction({
      tool: 'create_event',
      params: { date: '2026-05-01', title: '会', endTime: '11:00' },
    });
    expect(result.ok).toBe(false);
  });

  it('rejects empty updates objects', () => {
    const result = validateRawAction({
      tool: 'update_task',
      params: { taskId: 'abc', updates: {} },
    });
    expect(result.ok).toBe(false);
  });

  it('accepts moving an event without a separate updates object', () => {
    const result = validateRawAction({
      tool: 'update_event',
      params: { eventId: 'event-1', moveTo: '2026-05-02' },
    });
    expect(result.ok).toBe(true);
  });

  it('validates the expanded workspace tools', () => {
    expect(validateRawAction({
      tool: 'create_link',
      params: { title: 'LifeOS', url: 'https://example.com' },
    }).ok).toBe(true);
    expect(validateRawAction({
      tool: 'log_energy',
      params: { level: 11, timeOfDay: 'morning' },
    }).ok).toBe(false);
  });

  it('validates the deep-management tools (time / focus / planning / routine / resource / detail)', () => {
    // Time tracking
    expect(validateRawAction({
      tool: 'start_timer',
      params: { description: '写代码' },
    }).ok).toBe(true);
    expect(validateRawAction({ tool: 'start_timer', params: {} }).ok).toBe(false);
    expect(validateRawAction({
      tool: 'add_time_entry',
      params: { description: '会议', date: '2026-08-27', startTime: '09:00', endTime: '10:00' },
    }).ok).toBe(true);
    expect(validateRawAction({
      tool: 'add_time_entry',
      params: { description: '会议', date: '2026-08-27', startTime: '11:00', endTime: '10:00' },
    }).ok).toBe(false);
    expect(validateRawAction({
      tool: 'delete_time_entry',
      params: { descriptionQuery: '会议' },
    }).ok).toBe(true);

    // Focus & planning
    expect(validateRawAction({ tool: 'start_focus', params: {} }).ok).toBe(true);
    expect(validateRawAction({ tool: 'end_focus', params: {} }).ok).toBe(true);
    expect(validateRawAction({
      tool: 'add_goal',
      params: { text: '完成周报' },
    }).ok).toBe(true);
    expect(validateRawAction({ tool: 'toggle_goal', params: {} }).ok).toBe(false);

    // Routines / resources / templates
    expect(validateRawAction({
      tool: 'create_routine',
      params: { name: '晨间', timeOfDay: 'morning' },
    }).ok).toBe(true);
    expect(validateRawAction({
      tool: 'create_resource',
      params: { name: '小王', capacity: 0 },
    }).ok).toBe(false);
    expect(validateRawAction({
      tool: 'update_resource',
      params: { resourceId: 'r1', updates: {} },
    }).ok).toBe(false);
    expect(validateRawAction({
      tool: 'create_template',
      params: { name: '周报模板' },
    }).ok).toBe(true);

    // Kanban detail tools require text and exactly one ref
    expect(validateRawAction({
      tool: 'add_checklist_item',
      params: { titleQuery: '周报', text: '收集数据' },
    }).ok).toBe(true);
    expect(validateRawAction({
      tool: 'add_comment',
      params: { taskId: 't1' },
    }).ok).toBe(false);
  });

  it('requires safe, complete automation action configuration', () => {
    expect(validateRawAction({
      tool: 'create_automation',
      params: {
        name: '完成后归档',
        trigger: 'task.completed',
        action: 'archive',
      },
    }).ok).toBe(true);
    expect(validateRawAction({
      tool: 'create_automation',
      params: {
        name: '创建后移动',
        trigger: 'task.created',
        action: 'move_task',
      },
    }).ok).toBe(false);
    expect(validateRawAction({
      tool: 'create_automation',
      params: {
        name: '创建后删除',
        trigger: 'task.created',
        action: 'delete',
      },
    }).ok).toBe(false);
  });

  it('normalizes the Chinese enum aliases models actually emit', () => {
    const status = validateRawAction({
      tool: 'list_tasks',
      params: { status: '未完成' },
    });
    expect(status.ok).toBe(true);
    if (status.ok) expect(status.action.params.status).toBe('todo');

    const priority = validateRawAction({
      tool: 'create_task',
      params: { title: 'x', priority: '高' },
    });
    expect(priority.ok).toBe(true);
    if (priority.ok) expect(priority.action.params.priority).toBe('high');

    const update = validateRawAction({
      tool: 'update_task',
      params: { titleQuery: '周报', updates: { status: '进行中', priority: '紧急' } },
    });
    expect(update.ok).toBe(true);
    if (update.ok) {
      expect((update.action.params.updates as Record<string, string>).status).toBe('inprogress');
      expect((update.action.params.updates as Record<string, string>).priority).toBe('high');
    }

    const habit = validateRawAction({
      tool: 'log_energy',
      params: { level: 3, timeOfDay: '晚上' },
    });
    expect(habit.ok).toBe(true);
    if (habit.ok) expect(habit.action.params.timeOfDay).toBe('evening');
  });
});

describe('buildActionSummary', () => {
  it('summarizes task creation with due date and priority', () => {
    const summary = buildActionSummary('create_task', {
      title: '买菜',
      dueDate: '2026-05-01',
      priority: 'high',
    });
    expect(summary).toContain('创建任务「买菜」');
    expect(summary).toContain('截止 2026-05-01');
    expect(summary).toContain('优先级 high');
  });

  it('summarizes event creation with date and time', () => {
    const summary = buildActionSummary('create_event', {
      title: '组会',
      date: '2026-05-04',
      startTime: '10:00',
    });
    expect(summary).toBe('创建日程「组会」2026-05-04 10:00');
  });

  it('summarizes note operations', () => {
    expect(buildActionSummary('create_note', { title: '想法' })).toContain(
      '创建笔记「想法」'
    );
    expect(buildActionSummary('append_note', { titleQuery: '日记' })).toContain(
      '追加内容到笔记「日记」'
    );
  });
});
