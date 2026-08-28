import { describe, expect, it } from 'vitest';
import type { RetroData } from '../../weeklyRetrospective';
import { generateTemplateInsights, hasRetrospectiveEvidence } from '../insightsGenerator';

const emptyWeek: RetroData = {
  weekStart: new Date('2026-08-24T00:00:00'),
  weekEnd: new Date('2026-08-30T23:59:59'),
  weekLabel: '8月24日 - 2026年8月30日',
  tasks: { total: 0, completed: 0, created: 0, overdue: 0, completionRate: 0 },
  time: { totalSeconds: 0, hoursByProject: [], dailyAverageSeconds: 0, mostProductiveDay: null },
  habits: { trackedHabits: 0, overallCompletionRate: 0, streaksGained: 0, streaksLost: 0, bestHabit: null, worstHabit: null },
  calendar: { totalEvents: 0, meetingsCount: 0 },
  comparison: null,
};

describe('weekly retrospective honesty', () => {
  it('does not invent wins or a positive score without observations', () => {
    expect(hasRetrospectiveEvidence(emptyWeek)).toBe(false);
    const insights = generateTemplateInsights(emptyWeek);

    expect(insights.productivityScore).toBe(0);
    expect(insights.wins).toEqual([
      '暂无任务结果数据。',
      '暂无专注时间数据。',
      '暂无习惯或日历数据。',
    ]);
    expect(insights.improvements[1]).toBe('没有基线时不评判本周表现。');
  });

  it('recognizes a real calendar observation as evidence', () => {
    const withEvent: RetroData = {
      ...emptyWeek,
      calendar: { totalEvents: 1, meetingsCount: 0 },
    };
    expect(hasRetrospectiveEvidence(withEvent)).toBe(true);
  });
});
