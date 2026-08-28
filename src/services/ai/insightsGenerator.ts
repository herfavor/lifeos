/**
 * AI Insights Generator for Weekly Retrospective
 *
 * Generates structured insights from retrospective data.
 * Uses template-based generation by default.
 * AI generation can be triggered from the UI when a configured router is available.
 * Caches results in localStorage keyed by week.
 */

import type { RetroData } from '../weeklyRetrospective';
import type { AIProviderRouter } from './providerRouter';

// ─── Types ──────────────────────────────────────────────────

export interface WeeklyInsights {
  wins: [string, string, string];
  improvements: [string, string];
  actionItem: string;
  productivityScore: number; // 0-100
  generatedAt: string;
  source: 'ai' | 'template';
}

// ─── Cache ──────────────────────────────────────────────────

// v2 invalidates older template output that could praise an entirely empty
// week.  Old cache entries are harmless and can expire with site data.
const CACHE_PREFIX = 'retro-insights-v2-';

function getCacheKey(weekStart: Date): string {
  return `${CACHE_PREFIX}${weekStart.toISOString().split('T')[0]}`;
}

export function getCachedInsights(weekStart: Date): WeeklyInsights | null {
  try {
    const raw = localStorage.getItem(getCacheKey(weekStart));
    if (raw) return JSON.parse(raw) as WeeklyInsights;
  } catch {
    // ignore parse errors
  }
  return null;
}

function cacheInsights(weekStart: Date, insights: WeeklyInsights): void {
  try {
    localStorage.setItem(getCacheKey(weekStart), JSON.stringify(insights));
  } catch {
    // localStorage full or unavailable
  }
}

export function clearInsightsCache(weekStart: Date): void {
  try {
    localStorage.removeItem(getCacheKey(weekStart));
  } catch {
    // ignore
  }
}

// ─── Formatting Helper ──────────────────────────────────────

export function formatHours(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours === 0) return `${minutes}分钟`;
  if (minutes === 0) return `${hours}小时`;
  return `${hours}小时 ${minutes}分钟`;
}

/** Whether the selected week contains enough real observations to evaluate. */
export function hasRetrospectiveEvidence(data: RetroData): boolean {
  return data.tasks.total > 0 ||
    data.tasks.created > 0 ||
    data.tasks.completed > 0 ||
    data.tasks.overdue > 0 ||
    data.time.totalSeconds > 0 ||
    data.calendar.totalEvents > 0 ||
    data.habits.trackedHabits > 0;
}

// ─── Template-Based Insights ────────────────────────────────

export function generateTemplateInsights(data: RetroData): WeeklyInsights {
  const { tasks, time, habits, calendar, comparison } = data;
  const hasEvidence = hasRetrospectiveEvidence(data);

  const taskScore = Math.min(tasks.completionRate, 100);
  const habitScore = habits.overallCompletionRate;
  const timeScore = Math.min((time.totalSeconds / (40 * 3600)) * 100, 100);
  const productivityScore = Math.round(taskScore * 0.35 + habitScore * 0.35 + timeScore * 0.3);

  const wins: [string, string, string] = hasEvidence ? [
    tasks.completed > 0
      ? `本周你完成了 ${tasks.completed} 个任务${comparison && comparison.tasks.completedDelta > 0 ? `，比上周多 ${comparison.tasks.completedDelta} 个` : ''}。`
      : '本周暂无已完成任务记录。',
    time.totalSeconds > 0
      ? `你记录了 ${formatHours(time.totalSeconds)} 的专注工作${time.mostProductiveDay ? `，其中 ${time.mostProductiveDay} 是你效率最高的一天` : ''}。`
      : '本周暂无专注时间记录。',
    habits.overallCompletionRate > 50
      ? `你的习惯完成率为 ${habits.overallCompletionRate}%${habits.bestHabit ? `，其中“${habits.bestHabit}”表现最佳` : ''}。`
      : calendar.totalEvents > 0
        ? `你管理了 ${calendar.totalEvents} 个日历事件，其中包含 ${calendar.meetingsCount} 个会议。`
        : '本周暂无习惯或日历样本。',
  ] : [
    '暂无任务结果数据。',
    '暂无专注时间数据。',
    '暂无习惯或日历数据。',
  ];

  const improvements: [string, string] = hasEvidence ? [
    tasks.overdue > 0
      ? `有 ${tasks.overdue} 个任务已逾期。建议重新审视优先级和截止日期。`
      : comparison && comparison.tasks.completedDelta < 0
        ? `任务完成数比上周减少了 ${Math.abs(comparison.tasks.completedDelta)} 个。`
        : '建议设定更具体的每日目标，以保持前进的动力。',
    habits.worstHabit
      ? `“${habits.worstHabit}”需要关注——它是本周完成率最低的习惯。`
      : comparison && comparison.habits.rateDelta < 0
        ? `习惯坚持度比上周下降了 ${Math.abs(comparison.habits.rateDelta)}%。`
        : '尝试为深度工作预留专门的时间块，以最大化效率。',
  ] : [
    '先记录一项真实结果，再开始比较变化。',
    '没有基线时不评判本周表现。',
  ];

  const actionItem = !hasEvidence
    ? '记录下一件准备完成的事，并在完成后留下结果。'
    : tasks.overdue > 0
    ? `在开始新工作之前，先审查并重新安排 ${tasks.overdue} 个逾期任务。`
    : habits.overallCompletionRate < 50
      ? '本周专注于每天至少坚持完成一个习惯。'
      : time.totalSeconds < 10 * 3600
        ? '尝试更持续地记录你的工作时间，以便更好地了解你的效率规律。'
        : '保持当前节奏，并考虑记录你的最佳实践。';

  const insights: WeeklyInsights = {
    wins,
    improvements,
    actionItem,
    productivityScore: hasEvidence ? productivityScore : 0,
    generatedAt: new Date().toISOString(),
    source: 'template',
  };

  cacheInsights(data.weekStart, insights);
  return insights;
}

// ─── AI-Based Insights ──────────────────────────────────────

/**
 * Generate AI-powered insights using an already-configured provider router.
 * The router must have API keys already loaded (handled by the calling component).
 */
export async function generateAIInsights(
  data: RetroData,
  router: AIProviderRouter
): Promise<WeeklyInsights> {
  const systemPrompt = `你是一位生产力教练，正在分析用户的每周数据。
请仅以有效的 JSON 格式回复（不要使用 markdown 或代码围栏），格式如下：
{
  "wins": ["win1", "win2", "win3"],
  "improvements": ["improvement1", "improvement2"],
  "actionItem": "one specific actionable item",
  "productivityScore": 75
}

规则：
- wins：3 条基于数据的具体、鼓舞人心的观察（用简体中文撰写）
- improvements：2 条建设性建议（用简体中文撰写）
- actionItem：1 条具体、可执行的下周行动步骤（用简体中文撰写）
- productivityScore：根据整体表现给出 0-100 的分数`;

  const prompt = `周次：${data.weekLabel}

任务：完成 ${data.tasks.completed} 个，新建 ${data.tasks.created} 个，逾期 ${data.tasks.overdue} 个，完成率 ${data.tasks.completionRate}%
时间：共 ${formatHours(data.time.totalSeconds)}${data.time.mostProductiveDay ? `，效率最高的一天是 ${data.time.mostProductiveDay}` : ''}${data.time.hoursByProject.length > 0 ? `，主要项目：${data.time.hoursByProject[0].projectName}（${formatHours(data.time.hoursByProject[0].seconds)}）` : ''}
习惯：总体完成率 ${data.habits.overallCompletionRate}%${data.habits.bestHabit ? `，最佳：“${data.habits.bestHabit}”` : ''}${data.habits.worstHabit ? `，需改进：“${data.habits.worstHabit}”` : ''}
日历：共 ${data.calendar.totalEvents} 个事件，${data.calendar.meetingsCount} 个会议
${data.comparison ? `
与上周相比：任务 ${data.comparison.tasks.completedDelta >= 0 ? '+' : ''}${data.comparison.tasks.completedDelta}，时间 ${data.comparison.time.totalSecondsDelta >= 0 ? '+' : ''}${formatHours(Math.abs(data.comparison.time.totalSecondsDelta))}，习惯 ${data.comparison.habits.rateDelta >= 0 ? '+' : ''}${data.comparison.habits.rateDelta}%` : ''}`;

  try {
    const response = await router.sendMessage({
      prompt,
      systemPrompt,
      temperature: 0.7,
      maxTokens: 500,
    });

    const parsed = JSON.parse(response.content) as {
      wins: [string, string, string];
      improvements: [string, string];
      actionItem: string;
      productivityScore: number;
    };

    const insights: WeeklyInsights = {
      wins: parsed.wins,
      improvements: parsed.improvements,
      actionItem: parsed.actionItem,
      productivityScore: Math.max(0, Math.min(100, parsed.productivityScore)),
      generatedAt: new Date().toISOString(),
      source: 'ai',
    };

    cacheInsights(data.weekStart, insights);
    return insights;
  } catch {
    return generateTemplateInsights(data);
  }
}

// ─── Public API ─────────────────────────────────────────────

/**
 * Generate insights for a week.
 * Always uses template-based generation. For AI generation,
 * use generateAIInsights() directly with a configured router.
 */
export function generateInsights(data: RetroData): WeeklyInsights {
  const cached = getCachedInsights(data.weekStart);
  if (cached) return cached;

  return generateTemplateInsights(data);
}
