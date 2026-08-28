/**
 * Capability Metadata
 *
 * UI-facing metadata for every agent tool, kept separate from the zod
 * schemas so the registry stays lean. Powers:
 * - 左侧栏分组能力导航 (category)
 * - 操作卡片参数预览 (formatActionParams)
 * - 执行后「查看结果」跳转 (toolDestination)
 *
 * Adding a tool requires entries here (category + param labels) plus the
 * schema/executor work — everything else is generated.
 */

import type { AgentToolId, ActionResult } from './types';

export type AgentCapabilityCategory =
  | 'task'
  | 'calendar'
  | 'note'
  | 'project'
  | 'link'
  | 'automation'
  | 'habit'
  | 'energy'
  | 'time'
  | 'focus'
  | 'planning'
  | 'routine'
  | 'resource'
  | 'template';

export const AGENT_CATEGORY_ORDER: AgentCapabilityCategory[] = [
  'task',
  'calendar',
  'note',
  'project',
  'link',
  'automation',
  'habit',
  'energy',
  'time',
  'focus',
  'planning',
  'routine',
  'resource',
  'template',
];

export const AGENT_CATEGORY_LABELS: Record<AgentCapabilityCategory, string> = {
  task: '任务看板',
  calendar: '日程',
  note: '笔记',
  project: '项目',
  link: '收藏',
  automation: '自动化',
  habit: '习惯',
  energy: '精力',
  time: '时间追踪',
  focus: '专注模式',
  planning: '每日规划',
  routine: '例行程序',
  resource: '资源',
  template: '任务模板',
};

const CATEGORY: Record<AgentToolId, AgentCapabilityCategory> = {
  list_tasks: 'task',
  create_task: 'task',
  update_task: 'task',
  complete_task: 'task',
  delete_task: 'task',
  archive_task: 'task',
  restore_task: 'task',
  add_checklist_item: 'task',
  toggle_checklist_item: 'task',
  delete_checklist_item: 'task',
  add_comment: 'task',
  add_subtask: 'task',
  toggle_subtask: 'task',
  list_events: 'calendar',
  create_event: 'calendar',
  update_event: 'calendar',
  delete_event: 'calendar',
  create_note: 'note',
  append_note: 'note',
  update_note: 'note',
  archive_note: 'note',
  delete_note: 'note',
  restore_note: 'note',
  pin_note: 'note',
  list_notes: 'note',
  list_projects: 'project',
  create_project: 'project',
  update_project: 'project',
  archive_project: 'project',
  list_links: 'link',
  create_link: 'link',
  update_link: 'link',
  delete_link: 'link',
  list_automations: 'automation',
  create_automation: 'automation',
  toggle_automation: 'automation',
  delete_automation: 'automation',
  list_habits: 'habit',
  create_habit: 'habit',
  complete_habit: 'habit',
  archive_habit: 'habit',
  list_energy: 'energy',
  log_energy: 'energy',
  list_time_entries: 'time',
  start_timer: 'time',
  stop_timer: 'time',
  add_time_entry: 'time',
  delete_time_entry: 'time',
  start_focus: 'focus',
  end_focus: 'focus',
  add_goal: 'planning',
  toggle_goal: 'planning',
  list_routines: 'routine',
  create_routine: 'routine',
  delete_routine: 'routine',
  list_resources: 'resource',
  create_resource: 'resource',
  update_resource: 'resource',
  list_templates: 'template',
  create_template: 'template',
};

export function toolCategory(tool: AgentToolId): AgentCapabilityCategory {
  return CATEGORY[tool] ?? 'task';
}

// ────────────────────────────── param labels

const PARAM_LABELS: Record<string, string> = {
  title: '标题',
  description: '描述',
  priority: '优先级',
  status: '状态',
  dueDate: '截止日期',
  startDate: '开始日期',
  tags: '标签',
  date: '日期',
  startTime: '开始时间',
  endTime: '结束时间',
  moveTo: '改期至',
  text: '内容',
  name: '名称',
  email: '邮箱',
  capacity: '每周容量',
  skills: '技能',
  timeOfDay: '时段',
  estimatedMinutes: '预计分钟',
  notes: '备注',
  billable: '计费',
  level: '能量值',
  note: '备注',
  taskId: '任务',
  projectId: '项目',
  url: '链接',
  favorite: '收藏',
  query: '关键词',
  limit: '数量',
  includeArchived: '含归档',
  frequency: '频率',
  category: '分类',
  difficulty: '难度',
  targetDays: '目标日',
  timesPerWeek: '每周次数',
  color: '颜色',
  icon: '图标',
  nameQuery: '名称',
  titleQuery: '标题',
  trigger: '触发',
  action: '动作',
  actionConfig: '参数',
  entryId: '记录',
  descriptionQuery: '描述',
  parentId: '父项目',
  habitIds: '习惯',
  projectIds: '项目',
  favoriteOnly: '仅收藏',
};

const PRIORITY_LABELS: Record<string, string> = { low: '低', medium: '中', high: '高' };
const STATUS_LABELS: Record<string, string> = {
  backlog: '待规划',
  todo: '待办',
  inprogress: '进行中',
  review: '复审',
  done: '已完成',
};
const DAY_LABELS: Record<string, string> = {
  morning: '早晨',
  afternoon: '下午',
  evening: '晚间',
  anytime: '任意时间',
};

function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'boolean') return value ? '是' : '否';
  if (Array.isArray(value)) return value.map((v) => String(v)).join('、');
  if (key === 'priority') return PRIORITY_LABELS[String(value)] ?? String(value);
  if (key === 'status') return STATUS_LABELS[String(value)] ?? String(value);
  if (key === 'timeOfDay') return DAY_LABELS[String(value)] ?? String(value);
  if (key === 'level') return `${value}/10`;
  if (key === 'capacity') return `${value} 小时/周`;
  if (key === 'estimatedMinutes') return `${value} 分钟`;
  return String(value);
}

/**
 * Human-readable key/value pairs for the action card preview.
 * Unknown keys fall back to the raw key so nothing is silently dropped.
 */
export function formatActionParams(
  _tool: AgentToolId,
  params: Record<string, unknown>
): Array<{ label: string; value: string }> {
  const result: Array<{ label: string; value: string }> = [];
  const seen = new Set<string>();
  for (const [key, value] of Object.entries(params)) {
    if (['taskId', 'noteId', 'eventId', 'projectId', 'linkId', 'ruleId', 'habitId', 'routineId', 'resourceId', 'entryId'].includes(key)) {
      continue; // ids are noise in the preview; keep the human way of naming the target
    }
    const formatted = formatValue(key, value);
    if (!formatted) continue;
    seen.add(key);
    result.push({ label: PARAM_LABELS[key] ?? key, value: formatted });
  }
  // When only an id was given, show it so the card is still informative.
  if (result.length === 0) {
    const idOnly = Object.entries(params).find(([key]) => key.toLowerCase().includes('id'));
    if (idOnly && typeof idOnly[1] === 'string' && idOnly[1]) {
      result.push({ label: '目标', value: idOnly[1].slice(0, 12) });
    }
  }
  return result;
}

// ────────────────────────────── destinations

export interface AgentDestination {
  label: string;
  to: string;
}

/** Where to jump after execution so the user sees the same result the UI shows. */
export function toolDestination(
  tool: AgentToolId,
  params: Record<string, unknown>,
  _result?: ActionResult
): AgentDestination | null {
  switch (toolCategory(tool)) {
    case 'task':
      return { label: '任务看板', to: '/tasks' };
    case 'calendar':
      return { label: '日程', to: typeof params.date === 'string' && params.date ? `/schedule?date=${params.date}` : '/schedule' };
    case 'note':
      return { label: '笔记', to: '/notes' };
    case 'project':
      return { label: '项目', to: '/pm' };
    case 'link':
      return { label: '收藏', to: '/links' };
    case 'automation':
      return { label: '自动化', to: '/automations' };
    case 'habit':
      return { label: '习惯', to: '/habits' };
    case 'energy':
      return { label: '精力', to: '/energy' };
    case 'time':
      return { label: '时间追踪', to: '/schedule' };
    case 'focus':
      return { label: '专注模式', to: '/focus' };
    case 'planning':
      return { label: '今日视图', to: '/today' };
    case 'routine':
      return { label: '习惯(例行)', to: '/habits' };
    case 'resource':
      return { label: '任务看板', to: '/tasks' };
    case 'template':
      return { label: '任务模板', to: '/tasks' };
    default:
      return null;
  }
}
