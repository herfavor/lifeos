/**
 * Agent Tool Registry
 *
 * Single source of truth for every action the AI model may propose.
 * Each tool pairs a zod parameter schema (validation before execution)
 * with prompt-facing documentation and a zh-CN card summary builder.
 *
 * Adding a tool:
 * 1. Add its id to `AgentToolId` in ./types
 * 2. Define it in AGENT_TOOLS below (schema + docs + risk)
 * 3. Implement its executor branch in ./executor
 */

import { z } from 'zod';
import type { AgentToolId, AgentToolRisk, RawAgentAction, ValidatedAction } from './types';

const DATE_STRING = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, '日期必须为 YYYY-MM-DD 格式');
const TIME_STRING = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, '时间必须为 HH:mm（24 小时制）');

/** Exactly one of the given keys must be present (and non-empty). */
function exactlyOne(keys: string[]): (val: unknown) => boolean {
  return (val) => {
    const record = (val ?? {}) as Record<string, unknown>;
    const provided = keys.filter((k) => {
      const v = record[k];
      return typeof v === 'string' ? v.trim().length > 0 : v !== undefined && v !== null;
    });
    return provided.length === 1;
  };
}

// ────────────────────────────────────────────── parameter schemas

export const agentParamSchemas = {
  list_tasks: z.object({
    status: z.enum(['backlog', 'todo', 'inprogress', 'review', 'done']).optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
    tag: z.string().optional(),
    query: z.string().optional(),
    limit: z.number().int().min(1).max(50).optional(),
  }),
  create_task: z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
    status: z.enum(['backlog', 'todo', 'inprogress', 'review']).optional(),
    dueDate: DATE_STRING.optional(),
    startDate: DATE_STRING.optional(),
    tags: z.array(z.string()).max(8).optional(),
  }),
  update_task: z
    .object({
      taskId: z.string().optional(),
      titleQuery: z.string().optional(),
      updates: z
        .object({
          title: z.string().min(1).optional(),
          description: z.string().optional(),
          priority: z.enum(['low', 'medium', 'high']).optional(),
          status: z.enum(['backlog', 'todo', 'inprogress', 'review', 'done']).optional(),
          dueDate: DATE_STRING.nullable().optional(),
          startDate: DATE_STRING.nullable().optional(),
          addTags: z.array(z.string()).max(8).optional(),
          removeTags: z.array(z.string()).max(8).optional(),
        })
        .refine((u) => Object.keys(u).length > 0, { message: 'updates 不能为空' }),
    })
    .refine(exactlyOne(['taskId', 'titleQuery']), {
      message: 'taskId 与 titleQuery 必须二选一',
    }),
  complete_task: z
    .object({
      taskId: z.string().optional(),
      titleQuery: z.string().optional(),
    })
    .refine(exactlyOne(['taskId', 'titleQuery']), {
      message: 'taskId 与 titleQuery 必须二选一',
    }),
  delete_task: z
    .object({
      taskId: z.string().optional(),
      titleQuery: z.string().optional(),
    })
    .refine(exactlyOne(['taskId', 'titleQuery']), {
      message: 'taskId 与 titleQuery 必须二选一',
    }),
  archive_task: z
    .object({
      taskId: z.string().optional(),
      titleQuery: z.string().optional(),
    })
    .refine(exactlyOne(['taskId', 'titleQuery']), {
      message: 'taskId 与 titleQuery 必须二选一',
    }),
  restore_task: z
    .object({
      taskId: z.string().optional(),
      titleQuery: z.string().optional(),
    })
    .refine(exactlyOne(['taskId', 'titleQuery']), {
      message: 'taskId 与 titleQuery 必须二选一',
    }),
  add_checklist_item: z
    .object({
      taskId: z.string().optional(),
      titleQuery: z.string().optional(),
      text: z.string().min(1, '清单项内容不能为空'),
    })
    .refine(exactlyOne(['taskId', 'titleQuery']), {
      message: 'taskId 与 titleQuery 必须二选一',
    }),
  toggle_checklist_item: z
    .object({
      taskId: z.string().optional(),
      titleQuery: z.string().optional(),
      text: z.string().min(1, '清单项内容不能为空'),
    })
    .refine(exactlyOne(['taskId', 'titleQuery']), {
      message: 'taskId 与 titleQuery 必须二选一',
    }),
  delete_checklist_item: z
    .object({
      taskId: z.string().optional(),
      titleQuery: z.string().optional(),
      text: z.string().min(1, '清单项内容不能为空'),
    })
    .refine(exactlyOne(['taskId', 'titleQuery']), {
      message: 'taskId 与 titleQuery 必须二选一',
    }),
  add_comment: z
    .object({
      taskId: z.string().optional(),
      titleQuery: z.string().optional(),
      text: z.string().min(1, '评论内容不能为空'),
    })
    .refine(exactlyOne(['taskId', 'titleQuery']), {
      message: 'taskId 与 titleQuery 必须二选一',
    }),
  add_subtask: z
    .object({
      taskId: z.string().optional(),
      titleQuery: z.string().optional(),
      title: z.string().min(1),
      description: z.string().optional(),
    })
    .refine(exactlyOne(['taskId', 'titleQuery']), {
      message: 'taskId 与 titleQuery 必须二选一',
    }),
  toggle_subtask: z
    .object({
      taskId: z.string().optional(),
      titleQuery: z.string().optional(),
      title: z.string().min(1),
    })
    .refine(exactlyOne(['taskId', 'titleQuery']), {
      message: 'taskId 与 titleQuery 必须二选一',
    }),

  list_events: z.object({
    from: DATE_STRING.optional(),
    to: DATE_STRING.optional(),
  }),
  create_event: z
    .object({
      date: DATE_STRING,
      title: z.string().min(1),
      startTime: TIME_STRING.optional(),
      endTime: TIME_STRING.optional(),
      description: z.string().optional(),
    })
    .refine((v) => !v.endTime || Boolean(v.startTime), {
      message: '填写 endTime 时必须同时提供 startTime',
    }),
  update_event: z
    .object({
      eventId: z.string().optional(),
      titleQuery: z.string().optional(),
      /** Narrow the search to a single day (YYYY-MM-DD). */
      date: DATE_STRING.optional(),
      /** Move the event to another day. */
      moveTo: DATE_STRING.optional(),
      updates: z
        .object({
          title: z.string().min(1).optional(),
          startTime: TIME_STRING.optional(),
          endTime: TIME_STRING.optional(),
          description: z.string().optional(),
        })
        .optional(),
    })
    .refine(exactlyOne(['eventId', 'titleQuery']), {
      message: 'eventId 与 titleQuery 必须二选一',
    })
    .refine((value) => Boolean(value.moveTo) || Boolean(value.updates && Object.keys(value.updates).length), {
      message: 'moveTo 与 updates 至少提供一项',
    }),
  delete_event: z
    .object({
      eventId: z.string().optional(),
      titleQuery: z.string().optional(),
      date: DATE_STRING.optional(),
    })
    .refine(exactlyOne(['eventId', 'titleQuery']), {
      message: 'eventId 与 titleQuery 必须二选一',
    }),

  create_note: z.object({
    title: z.string().min(1),
    content: z.string().optional(),
    tags: z.array(z.string()).max(8).optional(),
  }),
  append_note: z
    .object({
      noteId: z.string().optional(),
      titleQuery: z.string().optional(),
      content: z.string().min(1),
    })
    .refine(exactlyOne(['noteId', 'titleQuery']), {
      message: 'noteId 与 titleQuery 必须二选一',
    }),
  update_note: z
    .object({
      noteId: z.string().optional(),
      titleQuery: z.string().optional(),
      updates: z.object({
        title: z.string().min(1).optional(),
        content: z.string().optional(),
        tags: z.array(z.string()).max(12).optional(),
      }).refine((u) => Object.keys(u).length > 0, { message: 'updates 不能为空' }),
    })
    .refine(exactlyOne(['noteId', 'titleQuery']), {
      message: 'noteId 与 titleQuery 必须二选一',
    }),
  archive_note: z
    .object({ noteId: z.string().optional(), titleQuery: z.string().optional() })
    .refine(exactlyOne(['noteId', 'titleQuery']), {
      message: 'noteId 与 titleQuery 必须二选一',
    }),
  delete_note: z
    .object({ noteId: z.string().optional(), titleQuery: z.string().optional() })
    .refine(exactlyOne(['noteId', 'titleQuery']), {
      message: 'noteId 与 titleQuery 必须二选一',
    }),
  restore_note: z
    .object({ noteId: z.string().optional(), titleQuery: z.string().optional() })
    .refine(exactlyOne(['noteId', 'titleQuery']), {
      message: 'noteId 与 titleQuery 必须二选一',
    }),
  pin_note: z
    .object({ noteId: z.string().optional(), titleQuery: z.string().optional() })
    .refine(exactlyOne(['noteId', 'titleQuery']), {
      message: 'noteId 与 titleQuery 必须二选一',
    }),
  list_notes: z.object({
    query: z.string().optional(),
    limit: z.number().int().min(1).max(50).optional(),
  }),

  list_projects: z.object({
    query: z.string().optional(),
    includeArchived: z.boolean().optional(),
  }),
  create_project: z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/, '颜色必须为 #RRGGBB').optional(),
    icon: z.string().optional(),
    parentId: z.string().nullable().optional(),
  }),
  update_project: z
    .object({
      projectId: z.string().optional(),
      nameQuery: z.string().optional(),
      updates: z.object({
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        color: z.string().regex(/^#[0-9a-fA-F]{6}$/, '颜色必须为 #RRGGBB').optional(),
        icon: z.string().optional(),
        parentId: z.string().nullable().optional(),
      }).refine((u) => Object.keys(u).length > 0, { message: 'updates 不能为空' }),
    })
    .refine(exactlyOne(['projectId', 'nameQuery']), {
      message: 'projectId 与 nameQuery 必须二选一',
    }),
  archive_project: z
    .object({ projectId: z.string().optional(), nameQuery: z.string().optional() })
    .refine(exactlyOne(['projectId', 'nameQuery']), {
      message: 'projectId 与 nameQuery 必须二选一',
    }),

  list_links: z.object({
    query: z.string().optional(),
    favoriteOnly: z.boolean().optional(),
    limit: z.number().int().min(1).max(50).optional(),
  }),
  create_link: z.object({
    url: z.string().url(),
    title: z.string().min(1),
    description: z.string().optional(),
    tags: z.array(z.string()).max(12).optional(),
    favorite: z.boolean().optional(),
    projectIds: z.array(z.string()).max(12).optional(),
  }),
  update_link: z
    .object({
      linkId: z.string().optional(),
      titleQuery: z.string().optional(),
      updates: z.object({
        url: z.string().url().optional(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        tags: z.array(z.string()).max(12).optional(),
        favorite: z.boolean().optional(),
        archived: z.boolean().optional(),
        projectIds: z.array(z.string()).max(12).optional(),
      }).refine((u) => Object.keys(u).length > 0, { message: 'updates 不能为空' }),
    })
    .refine(exactlyOne(['linkId', 'titleQuery']), {
      message: 'linkId 与 titleQuery 必须二选一',
    }),
  delete_link: z
    .object({ linkId: z.string().optional(), titleQuery: z.string().optional() })
    .refine(exactlyOne(['linkId', 'titleQuery']), {
      message: 'linkId 与 titleQuery 必须二选一',
    }),

  list_automations: z.object({ query: z.string().optional() }),
  create_automation: z
    .object({
      name: z.string().min(1),
      description: z.string().optional(),
      trigger: z.enum(['task.created', 'task.moved', 'task.completed']),
      action: z.enum(['move_task', 'set_priority', 'add_tag', 'remove_tag', 'set_status', 'add_comment', 'archive', 'set_due_date', 'set_estimate', 'duplicate', 'notify']),
      actionConfig: z.record(z.string(), z.unknown()).optional(),
    })
    .superRefine((value, context) => {
      const requiredConfig: Partial<Record<typeof value.action, string>> = {
        move_task: 'status',
        set_status: 'status',
        set_priority: 'priority',
        add_tag: 'tag',
        remove_tag: 'tag',
        add_comment: 'text',
        set_due_date: 'dueDate',
        set_estimate: 'estimatedHours',
        notify: 'message',
      };
      const key = requiredConfig[value.action];
      const configuredValue = key ? value.actionConfig?.[key] : undefined;
      if (key && (configuredValue === undefined || configuredValue === '')) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['actionConfig', key],
          message: `${value.action} 需要 actionConfig.${key}`,
        });
      }
    }),
  toggle_automation: z
    .object({ ruleId: z.string().optional(), nameQuery: z.string().optional(), enabled: z.boolean() })
    .refine(exactlyOne(['ruleId', 'nameQuery']), {
      message: 'ruleId 与 nameQuery 必须二选一',
    }),
  delete_automation: z
    .object({ ruleId: z.string().optional(), nameQuery: z.string().optional() })
    .refine(exactlyOne(['ruleId', 'nameQuery']), {
      message: 'ruleId 与 nameQuery 必须二选一',
    }),

  list_habits: z.object({ query: z.string().optional(), includeArchived: z.boolean().optional() }),
  create_habit: z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    frequency: z.enum(['daily', 'weekdays', 'weekends', 'specific-days', 'times-per-week']).optional(),
    targetDays: z.array(z.number().int().min(0).max(6)).optional(),
    timesPerWeek: z.number().int().min(1).max(7).optional(),
    category: z.enum(['health', 'productivity', 'learning', 'social', 'mindfulness', 'fitness', 'nutrition', 'creative', 'finance', 'uncategorized']).optional(),
    difficulty: z.enum(['trivial', 'easy', 'medium', 'hard']).optional(),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/, '颜色必须为 #RRGGBB').optional(),
    icon: z.string().optional(),
    projectIds: z.array(z.string()).max(12).optional(),
  }),
  complete_habit: z
    .object({ habitId: z.string().optional(), titleQuery: z.string().optional(), date: DATE_STRING.optional(), note: z.string().optional() })
    .refine(exactlyOne(['habitId', 'titleQuery']), {
      message: 'habitId 与 titleQuery 必须二选一',
    }),
  archive_habit: z
    .object({ habitId: z.string().optional(), titleQuery: z.string().optional() })
    .refine(exactlyOne(['habitId', 'titleQuery']), {
      message: 'habitId 与 titleQuery 必须二选一',
    }),

  list_energy: z.object({ date: DATE_STRING.optional(), days: z.number().int().min(1).max(31).optional() }),
  log_energy: z.object({
    level: z.number().int().min(1).max(10),
    timeOfDay: z.enum(['morning', 'afternoon', 'evening']),
    note: z.string().optional(),
  }),

  list_time_entries: z.object({
    date: DATE_STRING.optional(),
    days: z.number().int().min(1).max(31).optional(),
    limit: z.number().int().min(1).max(50).optional(),
  }),
  start_timer: z.object({
    description: z.string().min(1),
    taskId: z.string().optional(),
    projectId: z.string().optional(),
    billable: z.boolean().optional(),
  }),
  stop_timer: z.object({}),
  add_time_entry: z
    .object({
      description: z.string().min(1),
      date: DATE_STRING,
      startTime: TIME_STRING,
      endTime: TIME_STRING,
      notes: z.string().optional(),
      tags: z.array(z.string()).max(12).optional(),
      billable: z.boolean().optional(),
    })
    .refine((v) => v.endTime >= v.startTime, {
      message: 'endTime 不能早于 startTime（同一天内）',
    }),
  delete_time_entry: z
    .object({
      entryId: z.string().optional(),
      descriptionQuery: z.string().optional(),
    })
    .refine(exactlyOne(['entryId', 'descriptionQuery']), {
      message: 'entryId 与 descriptionQuery 必须二选一',
    }),

  start_focus: z.object({ taskId: z.string().optional() }),
  end_focus: z.object({}),

  add_goal: z.object({
    date: DATE_STRING.optional(),
    text: z.string().min(1),
  }),
  toggle_goal: z.object({
    date: DATE_STRING.optional(),
    text: z.string().min(1),
  }),

  list_routines: z.object({ query: z.string().optional() }),
  create_routine: z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    timeOfDay: z.enum(['morning', 'afternoon', 'evening', 'anytime']).optional(),
    estimatedMinutes: z.number().int().min(1).max(480).optional(),
    habitIds: z.array(z.string()).max(30).optional(),
  }),
  delete_routine: z
    .object({ routineId: z.string().optional(), nameQuery: z.string().optional() })
    .refine(exactlyOne(['routineId', 'nameQuery']), {
      message: 'routineId 与 nameQuery 必须二选一',
    }),

  list_resources: z.object({
    query: z.string().optional(),
    skills: z.array(z.string()).max(20).optional(),
  }),
  create_resource: z.object({
    name: z.string().min(1),
    email: z.string().email().optional(),
    capacity: z.number().int().min(1).max(80).optional(),
    skills: z.array(z.string()).max(30).optional(),
  }),
  update_resource: z
    .object({
      resourceId: z.string().optional(),
      nameQuery: z.string().optional(),
      updates: z.object({
        name: z.string().min(1).optional(),
        email: z.string().email().optional(),
        capacity: z.number().int().min(1).max(80).optional(),
        skills: z.array(z.string()).max(30).optional(),
      }).refine((u) => Object.keys(u).length > 0, { message: 'updates 不能为空' }),
    })
    .refine(exactlyOne(['resourceId', 'nameQuery']), {
      message: 'resourceId 与 nameQuery 必须二选一',
    }),

  list_templates: z.object({ query: z.string().optional() }),
  create_template: z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    tags: z.array(z.string()).max(20).optional(),
  }),
} satisfies Record<AgentToolId, z.ZodTypeAny>;

// ────────────────────────────────────────────── registry

export interface AgentToolDefinition {
  id: AgentToolId;
  label: string;
  risk: AgentToolRisk;
  /** One-line capability description embedded into the system prompt. */
  doc: string;
}

export const AGENT_TOOLS: Record<AgentToolId, AgentToolDefinition> = {
  list_tasks: {
    id: 'list_tasks',
    label: '查询任务',
    risk: 'read',
    doc: '按状态/优先级/标签/关键词筛选任务列表。参数：status?, priority?, tag?, query?, limit?',
  },
  create_task: {
    id: 'create_task',
    label: '创建任务',
    risk: 'write',
    doc: '新建看板任务。参数：title(必填), description?, priority(low|medium|high)?, dueDate(YYYY-MM-DD)?, startDate?, tags[]?, status?',
  },
  update_task: {
    id: 'update_task',
    label: '修改任务',
    risk: 'write',
    doc: '按 taskId 或 titleQuery 定位任务并修改。参数：taskId?|titleQuery?, updates{ title?, description?, priority?, status?, dueDate?(可 null 清除), startDate?, addTags[]?, removeTags[]? }',
  },
  complete_task: {
    id: 'complete_task',
    label: '完成任务',
    risk: 'write',
    doc: '将任务标记为完成。参数：taskId?|titleQuery?',
  },
  delete_task: {
    id: 'delete_task',
    label: '删除任务',
    risk: 'write',
    doc: '删除任务（谨慎使用，可撤销）。参数：taskId?|titleQuery?',
  },
  archive_task: {
    id: 'archive_task',
    label: '归档任务',
    risk: 'write',
    doc: '将任务移入归档（可撤销）。参数：taskId?|titleQuery?',
  },
  restore_task: {
    id: 'restore_task',
    label: '恢复任务',
    risk: 'write',
    doc: '从归档恢复任务。参数：taskId?|titleQuery?',
  },
  add_checklist_item: {
    id: 'add_checklist_item',
    label: '添加清单项',
    risk: 'write',
    doc: '为任务新增一个清单检查项。参数：taskId?|titleQuery?, text(必填)',
  },
  toggle_checklist_item: {
    id: 'toggle_checklist_item',
    label: '勾选/取消清单项',
    risk: 'write',
    doc: '切换任务清单项的完成状态。参数：taskId?|titleQuery?, text(按内容匹配唯一清单项)',
  },
  delete_checklist_item: {
    id: 'delete_checklist_item',
    label: '删除清单项',
    risk: 'write',
    doc: '删除任务的一个清单检查项。参数：taskId?|titleQuery?, text(按内容匹配)',
  },
  add_comment: {
    id: 'add_comment',
    label: '添加评论',
    risk: 'write',
    doc: '为任务添加一条讨论评论。参数：taskId?|titleQuery?, text(必填)',
  },
  add_subtask: {
    id: 'add_subtask',
    label: '添加子任务',
    risk: 'write',
    doc: '为任务添加子任务。参数：taskId?|titleQuery?, title(必填), description?',
  },
  toggle_subtask: {
    id: 'toggle_subtask',
    label: '勾选/取消子任务',
    risk: 'write',
    doc: '切换子任务完成状态。参数：taskId?|titleQuery?, title(按标题匹配唯一子任务)',
  },

  list_events: {
    id: 'list_events',
    label: '查询日程',
    risk: 'read',
    doc: '列出日期区间内的日历事件。参数：from?(YYYY-MM-DD), to?(YYYY-MM-DD)，默认未来 7 天',
  },
  create_event: {
    id: 'create_event',
    label: '创建日程',
    risk: 'write',
    doc: '在指定日期创建日历事件。参数：date(必填, YYYY-MM-DD), title(必填), startTime?(HH:mm), endTime?(需与 startTime 同填), description?',
  },
  update_event: {
    id: 'update_event',
    label: '修改日程',
    risk: 'write',
    doc: '按 eventId 或 titleQuery 定位事件并修改时间/标题/描述，或移动到新日期。参数：eventId?|titleQuery?, date?(缩小搜索范围), moveTo?(改期), updates{ title?, startTime?, endTime?, description? }',
  },
  delete_event: {
    id: 'delete_event',
    label: '删除日程',
    risk: 'write',
    doc: '删除日历事件（谨慎使用）。参数：eventId?|titleQuery?, date?(缩小搜索范围)',
  },

  create_note: {
    id: 'create_note',
    label: '创建笔记',
    risk: 'write',
    doc: '用 Markdown 内容创建一篇笔记。参数：title(必填), content?(Markdown), tags[]?',
  },
  append_note: {
    id: 'append_note',
    label: '追加笔记',
    risk: 'write',
    doc: '向已有笔记末尾追加 Markdown 内容。参数：noteId?|titleQuery?, content(必填, Markdown)',
  },
  update_note: {
    id: 'update_note',
    label: '修改笔记',
    risk: 'write',
    doc: '替换笔记标题、Markdown 正文或标签。参数：noteId?|titleQuery?, updates{title?, content?, tags[]?}',
  },
  archive_note: {
    id: 'archive_note',
    label: '归档笔记',
    risk: 'write',
    doc: '将笔记移入归档。参数：noteId?|titleQuery?',
  },
  delete_note: {
    id: 'delete_note',
    label: '删除笔记',
    risk: 'write',
    doc: '将笔记移入回收站（可恢复）。参数：noteId?|titleQuery?',
  },
  restore_note: {
    id: 'restore_note',
    label: '恢复笔记',
    risk: 'write',
    doc: '将回收站/归档中的笔记恢复。参数：noteId?|titleQuery?',
  },
  pin_note: {
    id: 'pin_note',
    label: '置顶/取消置顶笔记',
    risk: 'write',
    doc: '切换笔记置顶状态。参数：noteId?|titleQuery?',
  },
  list_notes: {
    id: 'list_notes',
    label: '搜索笔记',
    risk: 'read',
    doc: '按关键词搜索笔记标题与内容。参数：query?, limit?',
  },
  list_projects: {
    id: 'list_projects', label: '查询项目', risk: 'read',
    doc: '查询项目上下文。参数：query?, includeArchived?',
  },
  create_project: {
    id: 'create_project', label: '创建项目', risk: 'write',
    doc: '创建项目或子项目。参数：name(必填), description?, color?(#RRGGBB), icon?, parentId?',
  },
  update_project: {
    id: 'update_project', label: '修改项目', risk: 'write',
    doc: '修改项目信息或父级。参数：projectId?|nameQuery?, updates{name?, description?, color?, icon?, parentId?}',
  },
  archive_project: {
    id: 'archive_project', label: '归档项目', risk: 'write',
    doc: '归档项目。参数：projectId?|nameQuery?',
  },
  list_links: {
    id: 'list_links', label: '查询收藏', risk: 'read',
    doc: '搜索书签/收藏。参数：query?, favoriteOnly?, limit?',
  },
  create_link: {
    id: 'create_link', label: '收藏链接', risk: 'write',
    doc: '保存链接。参数：url(必填), title(必填), description?, tags[]?, favorite?, projectIds[]?',
  },
  update_link: {
    id: 'update_link', label: '修改收藏', risk: 'write',
    doc: '修改链接内容、标签、收藏/归档状态。参数：linkId?|titleQuery?, updates{url?, title?, description?, tags[]?, favorite?, archived?, projectIds[]?}',
  },
  delete_link: {
    id: 'delete_link', label: '移入回收站', risk: 'write',
    doc: '将链接软删除到回收站。参数：linkId?|titleQuery?',
  },
  list_automations: {
    id: 'list_automations', label: '查询自动化', risk: 'read',
    doc: '查询自动化规则。参数：query?',
  },
  create_automation: {
    id: 'create_automation', label: '创建自动化', risk: 'write',
    doc: '创建一条任务自动化。参数：name, description?, trigger, action；需要参数的操作必须提供对应 actionConfig。不支持创建延迟删除规则。',
  },
  toggle_automation: {
    id: 'toggle_automation', label: '开关自动化', risk: 'write',
    doc: '启用或停用自动化。参数：ruleId?|nameQuery?, enabled(必填)',
  },
  delete_automation: {
    id: 'delete_automation', label: '删除自动化', risk: 'write',
    doc: '删除自动化规则。参数：ruleId?|nameQuery?',
  },
  list_habits: {
    id: 'list_habits', label: '查询习惯', risk: 'read',
    doc: '查询习惯与完成进度。参数：query?, includeArchived?',
  },
  create_habit: {
    id: 'create_habit', label: '创建习惯', risk: 'write',
    doc: '创建习惯。参数：title, description?, frequency?, targetDays?, timesPerWeek?, category?, difficulty?, color?, icon?, projectIds[]?',
  },
  complete_habit: {
    id: 'complete_habit', label: '打卡习惯', risk: 'write',
    doc: '为指定日期的习惯打卡（已打卡时不会取消）。参数：habitId?|titleQuery?, date?, note?',
  },
  archive_habit: {
    id: 'archive_habit', label: '归档习惯', risk: 'write',
    doc: '归档习惯。参数：habitId?|titleQuery?',
  },
  list_energy: {
    id: 'list_energy', label: '查询能量', risk: 'read',
    doc: '查询指定日期或近期能量记录。参数：date?, days?',
  },
  log_energy: {
    id: 'log_energy', label: '记录能量', risk: 'write',
    doc: '记录当前能量。参数：level(1-10), timeOfDay(morning|afternoon|evening), note?',
  },
  list_time_entries: {
    id: 'list_time_entries', label: '查询时间记录', risk: 'read',
    doc: '查询时间追踪条目（计时器、手动补录）。参数：date?(YYYY-MM-DD), days?, limit?',
  },
  start_timer: {
    id: 'start_timer', label: '开始计时', risk: 'write',
    doc: '启动时间追踪计时器。参数：description(必填), taskId?, projectId?, billable?',
  },
  stop_timer: {
    id: 'stop_timer', label: '停止计时', risk: 'write',
    doc: '停止当前计时器并保存为一条时间记录。无参数',
  },
  add_time_entry: {
    id: 'add_time_entry', label: '补录时间', risk: 'write',
    doc: '手动补录一条时间记录。参数：description(必填), date, startTime, endTime(24 小时制), notes?, tags[]?, billable?',
  },
  delete_time_entry: {
    id: 'delete_time_entry', label: '删除时间记录', risk: 'write',
    doc: '删除一条时间记录。参数：entryId?|descriptionQuery?',
  },
  start_focus: {
    id: 'start_focus', label: '开始专注', risk: 'write',
    doc: '进入专注模式（可关联任务）。参数：taskId?',
  },
  end_focus: {
    id: 'end_focus', label: '结束专注', risk: 'write',
    doc: '退出专注模式。无参数',
  },
  add_goal: {
    id: 'add_goal', label: '添加每日目标', risk: 'write',
    doc: '为某天添加一个目标/三件要事。参数：text(必填), date?(默认今天, YYYY-MM-DD)',
  },
  toggle_goal: {
    id: 'toggle_goal', label: '勾选每日目标', risk: 'write',
    doc: '切换某天一个目标的完成状态。参数：text(必填), date?(默认今天)',
  },
  list_routines: {
    id: 'list_routines', label: '查询例行', risk: 'read',
    doc: '查询例行程序（习惯组合）。参数：query?',
  },
  create_routine: {
    id: 'create_routine', label: '创建例行', risk: 'write',
    doc: '创建例行程序。参数：name(必填), description?, timeOfDay?(morning|afternoon|evening|anytime), estimatedMinutes?, habitIds[]?',
  },
  delete_routine: {
    id: 'delete_routine', label: '删除例行', risk: 'write',
    doc: '删除例行程序。参数：routineId?|nameQuery?',
  },
  list_resources: {
    id: 'list_resources', label: '查询资源', risk: 'read',
    doc: '查询人员/资源及其技能、容量。参数：query?, skills[]?',
  },
  create_resource: {
    id: 'create_resource', label: '创建资源', risk: 'write',
    doc: '创建资源（人员）。参数：name(必填), email?, capacity?(每周小时数 1-80), skills[]?',
  },
  update_resource: {
    id: 'update_resource', label: '修改资源', risk: 'write',
    doc: '修改资源信息。参数：resourceId?|nameQuery?, updates{ name?, email?, capacity?, skills[]? }',
  },
  list_templates: {
    id: 'list_templates', label: '查询任务模板', risk: 'read',
    doc: '查询任务模板库。参数：query?',
  },
  create_template: {
    id: 'create_template', label: '创建任务模板', risk: 'write',
    doc: '创建任务模板（含名称、描述、标签）。参数：name(必填), description?, tags[]?',
  },
};

export const AGENT_TOOL_IDS = Object.keys(AGENT_TOOLS) as AgentToolId[];

export function getAgentTool(id: string): AgentToolDefinition | undefined {
  return AGENT_TOOLS[id as AgentToolId];
}

// ────────────────────────────────────────────── validation

/** Chinese aliases models commonly use for enum params — normalized before
 * zod validation so 「未完成」「待办」「高」 etc. just work. */
const STATUS_ALIASES: Record<string, string> = {
  未完成: 'todo', 待办: 'todo', 待处理: 'todo', 待开始: 'todo', 进行中: 'inprogress',
  处理中: 'inprogress', 进行: 'inprogress', 已完成: 'done', 完成: 'done', 待规划: 'backlog',
  积压: 'backlog', 复审: 'review', 待复审: 'review', 审核: 'review',
};
const PRIORITY_ALIASES: Record<string, string> = {
  高: 'high', 紧急: 'high', 最高: 'high', 中: 'medium', 普通: 'medium', 低: 'low', 最低: 'low',
};
const TIME_OF_DAY_ALIASES: Record<string, string> = {
  早晨: 'morning', 上午: 'morning', 下午: 'afternoon', 中午: 'afternoon', 晚上: 'evening', 晚间: 'evening',
};
const TRIGGER_ALIASES: Record<string, string> = {
  任务创建: 'task.created', 任务移动: 'task.moved', 任务完成: 'task.completed',
  创建任务: 'task.created', 完成任务: 'task.completed', 移动任务: 'task.moved',
};

/** Normalize model-emitted values into the canonical enum strings. */
export function normalizeActionParams(params: Record<string, unknown>): Record<string, unknown> {
  if (!params || typeof params !== 'object') return params;
  const copy: Record<string, unknown> = { ...params };

  if (typeof copy.status === 'string' && STATUS_ALIASES[copy.status]) {
    copy.status = STATUS_ALIASES[copy.status];
  }
  if (typeof copy.priority === 'string' && PRIORITY_ALIASES[copy.priority]) {
    copy.priority = PRIORITY_ALIASES[copy.priority];
  }
  if (typeof copy.timeOfDay === 'string' && TIME_OF_DAY_ALIASES[copy.timeOfDay]) {
    copy.timeOfDay = TIME_OF_DAY_ALIASES[copy.timeOfDay];
  }
  if (typeof copy.trigger === 'string' && TRIGGER_ALIASES[copy.trigger]) {
    copy.trigger = TRIGGER_ALIASES[copy.trigger];
  }

  // Recurring deep updates: status/priority may live inside `updates`.
  if (copy.updates && typeof copy.updates === 'object' && !Array.isArray(copy.updates)) {
    const updates = { ...(copy.updates as Record<string, unknown>) };
    let touched = false;
    if (typeof updates.status === 'string' && STATUS_ALIASES[updates.status]) {
      updates.status = STATUS_ALIASES[updates.status];
      touched = true;
    }
    if (typeof updates.priority === 'string' && PRIORITY_ALIASES[updates.priority]) {
      updates.priority = PRIORITY_ALIASES[updates.priority];
      touched = true;
    }
    if (touched) copy.updates = updates;
  }
  return copy;
}

export type ActionValidation =
  | { ok: true; action: ValidatedAction }
  | { ok: false; error: string };

/** Validate a raw model-emitted action against its zod schema. */
export function validateRawAction(raw: RawAgentAction): ActionValidation {
  const def = getAgentTool(raw.tool);
  if (!def) {
    return { ok: false, error: `未知工具：${raw.tool}` };
  }
  const normalized = normalizeActionParams(raw.params ?? {});
  const parsed = agentParamSchemas[def.id].safeParse(normalized);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const path = first?.path?.length ? `${first.path.map(String).join('.')}: ` : '';
    return { ok: false, error: `${path}${first?.message ?? '参数校验失败'}` };
  }
  return { ok: true, action: { tool: def.id, params: parsed.data as Record<string, unknown> } };
}

// ────────────────────────────────────────────── card summaries

function fmtDate(d: unknown): string {
  return typeof d === 'string' ? d : '';
}

/** Build the zh-CN one-liner shown on a confirmation card. */
export function buildActionSummary(tool: AgentToolId, params: Record<string, unknown>): string {
  const title = typeof params.title === 'string' ? params.title : '';
  switch (tool) {
    case 'create_task': {
      const bits = [
        fmtDate(params.dueDate) && `截止 ${fmtDate(params.dueDate)}`,
        typeof params.priority === 'string' &&
          params.priority !== 'medium' &&
          `优先级 ${params.priority}`,
      ].filter(Boolean);
      return `创建任务「${title}」${bits.length ? `（${bits.join('，')}）` : ''}`;
    }
    case 'update_task':
      return `修改任务「${String(params.titleQuery ?? params.taskId ?? '')}」`;
    case 'complete_task':
      return `完成任务「${String(params.titleQuery ?? params.taskId ?? '')}」`;
    case 'delete_task':
      return `删除任务「${String(params.titleQuery ?? params.taskId ?? '')}」`;
    case 'archive_task':
      return `归档任务「${String(params.titleQuery ?? params.taskId ?? '')}」`;
    case 'restore_task':
      return `恢复任务「${String(params.titleQuery ?? params.taskId ?? '')}」`;
    case 'add_checklist_item': {
      const task = String(params.titleQuery ?? params.taskId ?? '');
      return `为任务「${task}」添加清单项「${String(params.text ?? '')}」`;
    }
    case 'toggle_checklist_item': {
      const task = String(params.titleQuery ?? params.taskId ?? '');
      return `切换任务「${task}」清单项「${String(params.text ?? '')}」`;
    }
    case 'delete_checklist_item': {
      const task = String(params.titleQuery ?? params.taskId ?? '');
      return `删除任务「${task}」清单项「${String(params.text ?? '')}」`;
    }
    case 'add_comment': {
      const task = String(params.titleQuery ?? params.taskId ?? '');
      return `评论任务「${task}」`;
    }
    case 'add_subtask': {
      const task = String(params.titleQuery ?? params.taskId ?? '');
      return `为任务「${task}」添加子任务「${title}」`;
    }
    case 'toggle_subtask': {
      const task = String(params.titleQuery ?? params.taskId ?? '');
      return `切换任务「${task}」子任务「${String(params.title ?? '')}」`;
    }
    case 'create_event': {
      const time = typeof params.startTime === 'string' ? ` ${params.startTime}` : '';
      return `创建日程「${title}」${fmtDate(params.date)}${time}`;
    }
    case 'update_event': {
      const target = String(params.titleQuery ?? params.eventId ?? '');
      const move = params.moveTo ? `并改期至 ${fmtDate(params.moveTo)}` : '';
      return `修改日程「${target}」${move}`;
    }
    case 'delete_event':
      return `删除日程「${String(params.titleQuery ?? params.eventId ?? '')}」`;
    case 'create_note':
      return `创建笔记「${title}」`;
    case 'append_note':
      return `追加内容到笔记「${String(params.titleQuery ?? params.noteId ?? '')}」`;
    case 'update_note':
      return `修改笔记「${String(params.titleQuery ?? params.noteId ?? '')}」`;
    case 'archive_note':
      return `归档笔记「${String(params.titleQuery ?? params.noteId ?? '')}」`;
    case 'delete_note':
      return `删除笔记「${String(params.titleQuery ?? params.noteId ?? '')}」`;
    case 'restore_note':
      return `恢复笔记「${String(params.titleQuery ?? params.noteId ?? '')}」`;
    case 'pin_note':
      return `切换置顶笔记「${String(params.titleQuery ?? params.noteId ?? '')}」`;
    case 'create_project':
      return `创建项目「${String(params.name ?? '')}」`;
    case 'update_project':
      return `修改项目「${String(params.nameQuery ?? params.projectId ?? '')}」`;
    case 'archive_project':
      return `归档项目「${String(params.nameQuery ?? params.projectId ?? '')}」`;
    case 'create_link':
      return `收藏链接「${title}」`;
    case 'update_link':
      return `修改收藏「${String(params.titleQuery ?? params.linkId ?? '')}」`;
    case 'delete_link':
      return `将收藏「${String(params.titleQuery ?? params.linkId ?? '')}」移入回收站`;
    case 'create_automation':
      return `创建自动化「${String(params.name ?? '')}」`;
    case 'toggle_automation':
      return `${params.enabled ? '启用' : '停用'}自动化「${String(params.nameQuery ?? params.ruleId ?? '')}」`;
    case 'delete_automation':
      return `删除自动化「${String(params.nameQuery ?? params.ruleId ?? '')}」`;
    case 'create_habit':
      return `创建习惯「${title}」`;
    case 'complete_habit':
      return `打卡习惯「${String(params.titleQuery ?? params.habitId ?? '')}」`;
    case 'archive_habit':
      return `归档习惯「${String(params.titleQuery ?? params.habitId ?? '')}」`;
    case 'log_energy':
      return `记录能量 ${String(params.level ?? '')}/10`;
    case 'start_timer':
      return `开始计时「${String(params.description ?? '')}」`;
    case 'stop_timer':
      return '停止当前计时器';
    case 'add_time_entry':
      return `补录时间「${String(params.description ?? '')}」（${String(params.date ?? '')} ${String(params.startTime ?? '')}-${String(params.endTime ?? '')}）`;
    case 'delete_time_entry':
      return `删除时间记录「${String(params.descriptionQuery ?? params.entryId ?? '')}」`;
    case 'start_focus':
      return params.taskId ? '开始专注（关联任务）' : '开始专注模式';
    case 'end_focus':
      return '结束专注模式';
    case 'add_goal':
      return `添加每日目标「${String(params.text ?? '')}」${fmtDate(params.date) ? `（${fmtDate(params.date)}）` : ''}`;
    case 'toggle_goal':
      return `勾选每日目标「${String(params.text ?? '')}」`;
    case 'create_routine':
      return `创建例行「${String(params.name ?? '')}」`;
    case 'delete_routine':
      return `删除例行「${String(params.nameQuery ?? params.routineId ?? '')}」`;
    case 'create_resource':
      return `创建资源「${String(params.name ?? '')}」`;
    case 'update_resource':
      return `修改资源「${String(params.nameQuery ?? params.resourceId ?? '')}」`;
    case 'create_template':
      return `创建任务模板「${String(params.name ?? '')}」`;
    case 'list_tasks':
      return '查询任务列表';
    case 'list_events':
      return '查询日程';
    case 'list_notes':
      return '搜索笔记';
    case 'list_projects':
      return '查询项目';
    case 'list_links':
      return '查询收藏';
    case 'list_automations':
      return '查询自动化';
    case 'list_habits':
      return '查询习惯';
    case 'list_energy':
      return '查询能量记录';
    case 'list_time_entries':
      return '查询时间记录';
    case 'list_routines':
      return '查询例行';
    case 'list_resources':
      return '查询资源';
    case 'list_templates':
      return '查询任务模板';
    default:
      return '执行操作';
  }
}
