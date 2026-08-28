/**
 * Agent System Prompt Builder
 *
 * Composes the full system prompt for the conversational management layer:
 * role definition, today's date, the tool catalog + JSON action protocol,
 * the confirm-first policy, cross-module context, and recent execution
 * feedback. Provider-agnostic by design (no native function calling).
 */

import type { AgentToolId, ExecutionRecord } from './types';
import type { AIExecutionMode } from '../../../stores/useAISettingsStore';
import { AGENT_TOOLS } from './tools';
import {
  buildCrossModuleContext,
  contextToSystemPrompt,
} from '../contextBuilder';
import { useKanbanStore } from '../../../stores/useKanbanStore';
import { useCalendarStore } from '../../../stores/useCalendarStore';
import { useHabitStore } from '../../../stores/useHabitStore';
import { useEnergyStore } from '../../../stores/useEnergyStore';
import { useTimeTrackingStore } from '../../../stores/useTimeTrackingStore';
import { logger } from '../../logger';

const log = logger.module('AIAgentPrompt');

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'] as const;

function localDateKey(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Calendar store keys are NON-padded YYYY-M-D — normalize before indexing. */
function storeDateKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/**
 * Privacy-safe "today" count snapshot (no content, no titles) injected into
 * the agent prompt so the model can reason about the user's current day.
 */
export function buildTodaySnapshot(): string {
  try {
    const today = localDateKey(new Date());
    const parts: string[] = [`今日 ${today}`];

    // Tasks
    const tasks = (useKanbanStore.getState().tasks ?? []).filter((t) => t.status !== 'done');
    if (tasks.length > 0) {
      const overdue = tasks.filter((t) => t.dueDate && t.dueDate < today).length;
      const dueToday = tasks.filter((t) => t.dueDate === today).length;
      const inProgress = tasks.filter((t) => t.status === 'inprogress').length;
      parts.push(
        `未完成任务 ${tasks.length} 项` +
          (overdue ? `（逾期 ${overdue}）` : '') +
          (dueToday ? `（今日到期 ${dueToday}）` : '') +
          (inProgress ? `（进行中 ${inProgress}）` : '')
      );
    }

    // Calendar
    const events = useCalendarStore.getState().events ?? {};
    const todayCount = (events[storeDateKey(new Date())] ?? []).length;
    let upcomingCount = 0;
    for (let i = 1; i <= 3; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      upcomingCount += (events[storeDateKey(d)] ?? []).length;
    }
    if (todayCount || upcomingCount) {
      parts.push(`今日日程 ${todayCount} 条${upcomingCount ? `，未来 3 天 ${upcomingCount} 条` : ''}`);
    }

    // Habits
    const habits = useHabitStore.getState();
    const habitDateKey = `${new Date().getFullYear()}-${new Date().getMonth() + 1}-${new Date().getDate()}`;
    const activeHabits = habits.habits.filter((h) => !h.archivedAt);
    const completedToday = habits.completions.filter((c) => c.date === habitDateKey).length;
    if (activeHabits.length > 0) {
      const pending = Math.max(0, activeHabits.length - completedToday);
      parts.push(`习惯 ${activeHabits.length} 个（今日已完成 ${completedToday}，待完成 ${pending}）`);
    }

    // Energy
    const energyToday = useEnergyStore.getState().logs.filter((l) => l.date === today).length;
    if (energyToday > 0) parts.push(`今日已记录能量 ${energyToday} 次`);

    // Timer
    const activeEntry = useTimeTrackingStore.getState().activeEntry;
    if (activeEntry) {
      parts.push('计时器运行中');
    }

    return parts.join('；');
  } catch (error) {
    log.warn('Failed to build today snapshot', { error });
    return '';
  }
}

/** Tool catalog lines embedded into the prompt. */
function toolCatalog(): string {
  return (Object.keys(AGENT_TOOLS) as AgentToolId[])
    .map((id) => `- ${id}：${AGENT_TOOLS[id].doc}`)
    .join('\n');
}

/**
 * Section describing the outcome of auto-executed read-only queries from
 * the previous agent round, injected into the follow-up request.
 */
export function buildQueryResultsSection(
  results: Array<{ tool: AgentToolId; message: string }>
): string {
  if (results.length === 0) return '';
  const body = results.map((r) => `【${r.tool}】\n${r.message}`).join('\n\n');
  return `\n\n## 系统查询结果（由上一轮工具调用自动执行得到，可直接引用）\n\n${body}`;
}

export interface AgentPromptOptions {
  /** Compact records of recently confirmed/executed write actions. */
  executions?: ExecutionRecord[];
  /** Explicit opt-in for sending local workspace summaries to the provider. */
  includeCrossModuleContext?: boolean;
  /** User-authored global instructions from AI settings. */
  customInstructions?: string;
  /** Privacy-safe today count snapshot (default: omit unless provided). */
  todaySnapshot?: string;
  /** Current execution authority so the model knows its permissions. */
  executionMode?: AIExecutionMode;
}

function appendOptionalContext(sections: string[], include: boolean): void {
  if (!include) return;
  try {
    const context = buildCrossModuleContext();
    sections.push(contextToSystemPrompt(context));
  } catch (error) {
    log.warn('Failed to build cross-module context', { error });
  }
}

/**
 * Build the complete system prompt for one agent request.
 */
export function buildAgentSystemPrompt(options: AgentPromptOptions = {}): string {
  const now = new Date();
  const dateKey = localDateKey(now);
  const weekday = `星期${WEEKDAY_LABELS[now.getDay()]}`;

  const sections: string[] = [];

  // ── Role & mission ──
  sections.push(
    '你是 LifeOS（本地优先的个人管理平台）内置的 AI 管理助手。' +
      '你可以通过「工具」管理用户的任务、日程、笔记、项目、收藏、自动化、习惯、精力、时间追踪、专注模式、每日目标、例行、资源与任务模板：' +
      '你的每次写操作都会先以卡片形式呈给用户（或按当前权限模式自动执行），' +
      '因此你永远不应该声称某个写操作“已经完成”，只能说“已提交执行”。'
  );

  // ── Execution authority ──
  if (options.executionMode === 'auto') {
    sections.push(
      '当前为「自动执行」模式：写操作不需要用户确认，系统会在你输出动作后立即执行，并向用户展示操作日志（可撤销）。你仍应按工具协议输出动作块；正文中可以直接告诉用户你已执行了什么。'
    );
  } else if (options.executionMode === 'readonly') {
    sections.push(
      '当前为「只读」模式：你只能使用 list_ 开头的查询工具，绝对禁止提议任何写操作。用户需要操作时，你应给出建议步骤并提醒用户切换执行模式。'
    );
  } else {
    sections.push(
      '当前为「询问确认」模式：写操作必须等用户点击确认卡片后才会真正执行，因此你永远不应该声称某个写操作“已经完成”，只能说“已提交待确认”。'
    );
  }

  // ── Date awareness ──
  sections.push(`今天是 ${dateKey}（${weekday}）。所有日期一律使用 YYYY-MM-DD 格式并基于今天推算；时间使用 24 小时制 HH:mm。`);

  // ── Tools & protocol ──
  sections.push(
    `## 可用工具\n\n${toolCatalog()}\n\n` +
      '**调用协议（严格遵守）：**\n' +
      '1. 需要执行操作时，在回复的最末尾输出一个 json 代码块，格式如下：\n' +
      '```json\n{"actions":[{"tool":"create_task","params":{"title":"写周报","priority":"high","dueDate":"' +
      dateKey +
      '"}}]}\n```\n' +
      '2. 一个代码块内可以包含多个动作（按顺序执行）；也可以在正文里先用文字解释你要做什么。\n' +
      '3. 所有 list_ 开头的只读查询都不需要确认：你可以只回复一个仅含查询动作的代码块，系统会立即执行并在下一轮把结果提供给你。\n' +
      '4. 除 json 代码块外，不要用其他任何方式表达操作意图（例如不要输出“我将为你创建…”却不给代码块）。如果系统已经自动执行了你的查询（“系统查询结果”出现后），直接基于结果给出最终回答：**不要复述用户的请求，不要再次查询，不要输出“我先查询…”这类过程性文字**。\n' +
      '5. 优先行动，不要把可合理推断的小缺口变成追问。对象不明确时先用只读查询自行消歧；日期/时间只有在用户明确要求精确值且无法从上下文推断时才提问。对于“下午”“明天”“安排能安排的”等表达，采用保守、常见默认值直接执行可撤销操作，并在结果中简短说明假设、提供修改/撤销入口。只有永久删除、不可逆批量覆盖、外部发送等高风险动作，或查询后仍存在多个同等可能目标时，才向用户提一个必要问题。\n' +
      '6. 引用已有条目时优先使用查询结果中的精确标题或 id；titleQuery 使用子串匹配即可。\n' +
      '7. 枚举参数（status/priority/timeOfDay/trigger）请使用英文标准值，例如 status 用 backlog/todo/inprogress/review/done；中文别名也可以，但英文更可靠。\n' +
      '8. 代码块必须是严格合法的 JSON：字符串内部禁止直接换行，换行一律写成 \\n 转义；内容较长（如笔记正文）时也要保持单行转义，不要为了美观而分行；不要在字符串里输出三个连续反引号。\n' +
      '9. 如果一条查询动作的参数不合法，不要把它原样输出两次——去掉出错的参数重试一次即可，不要反复输出同一段 JSON。'
  );

  // ── Style ──
  sections.push(
    '回答保持简洁、结构化（可用 Markdown 列表）。涉及规划建议时给出具体、可执行的下一步。与用户交流使用中文。默认采取“先做可逆操作，再允许撤销”的交互风格：不要复述请求，不要连续追问，不要为了确认显而易见的意图而打断用户。多个同类操作应在正文中合并成一条结果摘要，而不是逐条播报系统日志。'
  );

  // ── Today snapshot (counts only, privacy-safe) ──
  if (options.todaySnapshot) {
    sections.push(`## 今日快照（计数摘要，用于辅助规划）\n\n${options.todaySnapshot}`);
  }

  // ── Cross-module snapshot (privacy opt-in) ──
  appendOptionalContext(sections, options.includeCrossModuleContext === true);

  if (options.customInstructions?.trim()) {
    sections.push(`## 用户自定义指令\n\n${options.customInstructions.trim()}`);
  }

  // ── Recent executed actions ──
  if (options.executions && options.executions.length > 0) {
    const lines = options.executions
      .slice(0, 8)
      .map((e) => `- ${e.success ? '✅' : '❌'} ${e.summary}`)
      .join('\n');
    sections.push(`## 最近已执行的操作（用户确认过）\n\n${lines}`);
  }

  return sections.join('\n\n');
}

/**
 * Prompt for unrestricted conversation. It intentionally contains no tool
 * protocol, so code blocks and JSON requested by the user are returned as
 * normal content instead of being interpreted as LifeOS operations.
 */
export function buildChatSystemPrompt(options: AgentPromptOptions = {}): string {
  const now = new Date();
  const sections = [
    '你是 LifeOS 内置的通用 AI 对话助手。当前处于“聊天模式”：专注于回答、写作、分析、翻译、构思、代码与用户要求的任何正常内容。不要调用或虚构 LifeOS 工具，不要输出操作协议，也不要声称修改了本地数据。',
    `今天是 ${localDateKey(now)}（星期${WEEKDAY_LABELS[now.getDay()]}）。`,
    '准确遵循用户对语言、格式、长度与风格的要求；需要长文、表格、代码或完整草稿时直接给出，不要为了简短而省略关键内容。默认使用中文。',
  ];
  appendOptionalContext(sections, options.includeCrossModuleContext === true);
  if (options.customInstructions?.trim()) {
    sections.push(`## 用户自定义指令\n\n${options.customInstructions.trim()}`);
  }
  return sections.join('\n\n');
}
