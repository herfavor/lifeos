/**
 * Agent prompt builder tests: date grounding, tool catalog, protocol rules
 * and optional sections.
 */
import { describe, it, expect } from 'vitest';
import { buildAgentSystemPrompt, buildChatSystemPrompt, buildQueryResultsSection } from '../promptBuilder';

describe('buildAgentSystemPrompt', () => {
  it('grounds the model with today date and weekday', () => {
    const prompt = buildAgentSystemPrompt();
    expect(prompt).toMatch(/今天是 \d{4}-\d{2}-\d{2}（星期[一二三四五六日]）/);
  });

  it('documents every tool and the json protocol', () => {
    const prompt = buildAgentSystemPrompt();
    expect(prompt).toContain('## 可用工具');
    expect(prompt).toContain('create_task');
    expect(prompt).toContain('list_events');
    expect(prompt).toContain('append_note');
    expect(prompt).toContain('{"actions"');
    expect(prompt).toContain('确认');
  });

  it('prefers reversible action over unnecessary clarification', () => {
    const prompt = buildAgentSystemPrompt({ executionMode: 'auto' });
    expect(prompt).toContain('优先行动');
    expect(prompt).toContain('安排能安排的');
    expect(prompt).toContain('不要连续追问');
    expect(prompt).toContain('先做可逆操作，再允许撤销');
  });

  it('keeps destructive ambiguity behind an explicit safety boundary', () => {
    const prompt = buildAgentSystemPrompt({ executionMode: 'auto' });
    expect(prompt).toContain('永久删除');
    expect(prompt).toContain('不可逆批量覆盖');
    expect(prompt).toContain('多个同等可能目标');
  });

  it('includes recent executions when provided', () => {
    const prompt = buildAgentSystemPrompt({
      executions: [
        { tool: 'create_task', summary: '已创建任务「A」', success: true, at: Date.now() },
      ],
    });
    expect(prompt).toContain('最近已执行的操作');
    expect(prompt).toContain('已创建任务「A」');
  });

  it('omits execution section by default', () => {
    expect(buildAgentSystemPrompt()).not.toContain('最近已执行的操作');
  });

  it('does not expose workspace summaries without explicit opt-in', () => {
    expect(buildAgentSystemPrompt()).not.toContain('以下是用户的当前状态');
    expect(buildAgentSystemPrompt({ includeCrossModuleContext: true })).toContain(
      '以下是用户的当前状态'
    );
  });

  it('builds a separate unrestricted chat prompt without tool protocol', () => {
    const prompt = buildChatSystemPrompt({ customInstructions: '请给出完整草稿' });
    expect(prompt).toContain('聊天模式');
    expect(prompt).toContain('请给出完整草稿');
    expect(prompt).not.toContain('## 可用工具');
  });
});

describe('buildQueryResultsSection', () => {
  it('formats query outputs for the follow-up turn', () => {
    const section = buildQueryResultsSection([
      { tool: 'list_tasks', message: '- 任务A' },
    ]);
    expect(section).toContain('系统查询结果');
    expect(section).toContain('【list_tasks】');
    expect(section).toContain('- 任务A');
  });

  it('returns empty string without results', () => {
    expect(buildQueryResultsSection([])).toBe('');
  });
});
