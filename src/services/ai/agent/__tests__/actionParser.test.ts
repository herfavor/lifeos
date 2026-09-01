/**
 * Action parser tests: fenced JSON extraction, text cleaning, invalid
 * payload handling and provider history folding.
 */
import { describe, it, expect } from 'vitest';
import { extractActionPayloads, parseAgentReply, historyForProvider } from '../actionParser';
import type { AgentChatMessage } from '../types';

describe('extractActionPayloads', () => {
  it('finds an actions array inside a json fence', () => {
    const text = '说明文字\n```json\n{"actions":[{"tool":"create_task","params":{"title":"A"}}]}\n```';
    const payloads = extractActionPayloads(text);
    expect(payloads).toHaveLength(1);
    expect(payloads[0].actions).toHaveLength(1);
  });

  it('ignores ordinary code fences without an actions key', () => {
    const text = '示例：\n```json\n{"foo": 1}\n```\n结束';
    expect(extractActionPayloads(text)).toHaveLength(0);
  });

  it('ignores fences with invalid JSON', () => {
    const text = '```json\n{"actions": [oops]}\n```';
    expect(extractActionPayloads(text)).toHaveLength(0);
  });

  it('accepts a bare top-level array of actions', () => {
    const text = '```json\n[{"tool":"list_tasks"}]\n```';
    const payloads = extractActionPayloads(text);
    expect(payloads[0]?.actions).toHaveLength(1);
  });

  it('recovers a note payload whose content string contains literal newlines', () => {
    // Models pretty-print long note bodies with real line breaks inside the
    // JSON string — invalid JSON, previously swallowed as a "code sample"
    // so no confirmation card ever rendered.
    const reply = [
      '已整理成笔记，请确认：',
      '```json',
      '{',
      '  "actions": [',
      '    {',
      '      "tool": "create_note",',
      '      "params": {',
      '        "title": "读书笔记",',
      '        "content": "# 第一章',
      '正文段落。',
      '# 第二章',
      '更多内容。"',
      '      }',
      '    }',
      '  ]',
      '}',
      '```',
    ].join('\n');

    const { cleanedText, actions } = parseAgentReply(reply);
    expect(actions).toHaveLength(1);
    expect(actions[0].status).toBe('pending');
    expect(actions[0].tool).toBe('create_note');
    expect(actions[0].summary).toContain('创建笔记「读书笔记」');
    expect(actions[0].params.content).toBe('# 第一章\n正文段落。\n# 第二章\n更多内容。');
    expect(cleanedText).not.toContain('create_note');
    expect(cleanedText).toContain('已整理成笔记，请确认：');
  });

  it('recovers a note payload whose content contains embedded code fences', () => {
    // The inner ``` terminates the outer fence early under a non-greedy
    // regex; recovery must balance-scan past it.
    const innerFence = '```';
    const reply =
      '请确认：\n```json\n{"actions":[{"tool":"create_note","params":{"title":"周报","content":"## 命令\n' +
      innerFence +
      'bash\nnpm test\n' +
      innerFence +
      '"}}]}\n```\n以上操作待确认。';

    const { cleanedText, actions } = parseAgentReply(reply);
    expect(actions).toHaveLength(1);
    expect(actions[0].status).toBe('pending');
    expect(actions[0].tool).toBe('create_note');
    expect(actions[0].summary).toContain('创建笔记「周报」');
    expect(actions[0].params.content).toContain('npm test');
    expect(cleanedText).not.toContain('"actions"');
    expect(cleanedText).toContain('以上操作待确认。');
  });

  it('tolerates trailing commas in an action payload', () => {
    const reply = '```json\n{"actions":[{"tool":"create_task","params":{"title":"A",}},]}\n```';
    const { actions } = parseAgentReply(reply);
    expect(actions).toHaveLength(1);
    expect(actions[0].status).toBe('pending');
    expect(actions[0].tool).toBe('create_task');
  });

  it('harvests an unfenced actions payload emitted without code fences', () => {
    const reply = '好的。{"actions":[{"tool":"create_note","params":{"title":"灵感"}}]}';
    const { cleanedText, actions } = parseAgentReply(reply);
    expect(actions).toHaveLength(1);
    expect(actions[0].tool).toBe('create_note');
    expect(cleanedText).not.toContain('"actions"');
  });
});

describe('parseAgentReply', () => {
  it('strips the action block from display text and emits pending proposals', () => {
    const reply = [
      '好的，我来帮你创建任务。',
      '```json',
      '{"actions":[{"tool":"create_task","params":{"title":"买牛奶","priority":"high"}}]}',
      '```',
    ].join('\n');

    const { cleanedText, actions } = parseAgentReply(reply);
    expect(cleanedText).not.toContain('create_task');
    expect(cleanedText).toContain('好的，我来帮你创建任务');
    expect(actions).toHaveLength(1);
    expect(actions[0].status).toBe('pending');
    expect(actions[0].summary).toContain('创建任务「买牛奶」');
    expect(actions[0].params.priority).toBe('high');
  });

  it('marks known tools with invalid params as failed proposals', () => {
    const reply = '```json\n{"actions":[{"tool":"delete_task"}]}\n```';
    const { actions } = parseAgentReply(reply);
    expect(actions).toHaveLength(1);
    expect(actions[0].status).toBe('failed');
    expect(actions[0].result?.message).toContain('参数无效');
  });

  it('drops unknown tools entirely', () => {
    const reply = '```json\n{"actions":[{"tool":"nuke_everything"}]}\n```';
    const { actions } = parseAgentReply(reply);
    expect(actions).toHaveLength(0);
  });

  it('returns plain text untouched when no payloads exist', () => {
    const { cleanedText, actions } = parseAgentReply('今天没有安排。');
    expect(cleanedText).toBe('今天没有安排。');
    expect(actions).toHaveLength(0);
  });

  it('flags an unbacked deletion claim so the UI can avoid presenting it as fact', () => {
    const parsed = parseAgentReply('我已经删除了「旧任务」。');
    expect(parsed.actions).toHaveLength(0);
    expect(parsed.unverifiedExecutionClaim).toBe(true);
  });

  it('does not flag deletion advice or replies with a structured action', () => {
    expect(parseAgentReply('你可以删除「旧任务」。').unverifiedExecutionClaim).toBe(false);
    expect(
      parseAgentReply('我已删除了「旧任务」。\n```json\n{"actions":[{"tool":"delete_task","params":{"taskId":"task-1"}}]}\n```').unverifiedExecutionClaim
    ).toBe(false);
  });

  it('strict mode sweeps residual action JSON the model leaked into prose', () => {
    const reply = [
      '我重新查询一下未完成的任务，然后我再给出时间表。',
      '----',
      '{"actions":[{"tool":"list_tasks","params":{}}]}',
      '----',
      '好的，以下是建议。',
    ].join('\n');
    const { cleanedText } = parseAgentReply(reply, { strictToolSweep: true });
    expect(cleanedText).not.toContain('"actions"');
    expect(cleanedText).not.toContain('list_tasks');
    expect(cleanedText).toContain('以下是建议');
  });

  it('strict mode sweeps fenced payloads that failed to become cards', () => {
    const reply =
      '我先查询。\n```json\n{"actions":[{"tool":"list_tasks","params":{"status":"未完成"}}]}\n```\n再等下。';
    const { cleanedText, actions } = parseAgentReply(reply, {
      strictToolSweep: true,
      suppressFailedReads: true,
    });
    // Normalization makes the Chinese status valid, so we get a real card.
    expect(actions).toHaveLength(1);
    expect(actions[0].status).toBe('pending');
    expect(actions[0].params.status).toBe('todo');
    expect(cleanedText).not.toContain('"actions"');
  });

  it('suppresses failed READ cards while keeping failed write cards', () => {
    const badRead =
      '```json\n{"actions":[{"tool":"list_tasks","params":{"status":"???oops"}}]}\n```';
    const readResult = parseAgentReply(badRead, { suppressFailedReads: true });
    expect(readResult.actions).toHaveLength(0);

    const badWrite =
      '```json\n{"actions":[{"tool":"delete_task","params":{}}]}\n```';
    const writeResult = parseAgentReply(badWrite, { suppressFailedReads: true });
    expect(writeResult.actions).toHaveLength(1);
    expect(writeResult.actions[0].status).toBe('failed');
  });
});

describe('historyForProvider', () => {
  it('folds executed / rejected / pending action statuses into notes', () => {
    const messages: AgentChatMessage[] = [
      { id: '1', role: 'user', content: '帮我创建任务', ts: 1 },
      {
        id: '2',
        role: 'assistant',
        content: '已提交以下操作：',
        ts: 2,
        actions: [
          {
            id: 'a1',
            tool: 'create_task',
            params: {},
            status: 'executed',
            summary: '创建任务「A」',
            result: { success: true, message: '已创建任务「A」' },
            createdAt: 1,
          },
          {
            id: 'a2',
            tool: 'delete_task',
            params: {},
            status: 'rejected',
            summary: '删除任务「B」',
            createdAt: 2,
          },
          {
            id: 'a3',
            tool: 'create_event',
            params: {},
            status: 'pending',
            summary: '创建日程「C」',
            createdAt: 3,
          },
        ],
      },
    ];

    const history = historyForProvider(messages);
    expect(history).toHaveLength(2);
    const last = history[1].content;
    expect(last).toContain('[已执行 创建任务「A」');
    expect(last).toContain('[用户拒绝 删除任务「B」]');
    expect(last).toContain('[待确认 创建日程「C」]');
  });
});
