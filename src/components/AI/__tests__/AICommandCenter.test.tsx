/**
 * AI Command Center integration tests.
 *
 * Mocks only the network layer (providerRouter); everything else is real:
 * agent parsing, confirmation cards, and actual store mutations. Verifies
 * the full conversational management loop:
 *   send message → assistant proposes action card → user confirms →
 *   task created in the Kanban store.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

vi.spyOn(console, 'error').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});

const sendMessageMock = vi.fn();

vi.mock('../../../services/ai/providerRouter', () => ({
  createDefaultRouter: () => ({
    updateConfig: vi.fn(),
    getAllProviderMetadata: () => ({}),
    setProviderApiKey: vi.fn(),
    getConfiguredProviders: async () => ['openai'],
    sendMessage: sendMessageMock,
  }),
}));

import { AICommandCenter } from '../AICommandCenter';
import { useAIWorkspaceStore } from '../../../stores/useAIWorkspaceStore';
import { useAISettingsStore } from '../../../stores/useAISettingsStore';
import { useKanbanStore } from '../../../stores/useKanbanStore';

const ACTION_REPLY = [
  '好的，这就为你创建任务。',
  '```json',
  '{"actions":[{"tool":"create_task","params":{"title":"买牛奶","priority":"high"}}]}',
  '```',
].join('\n');

function switchMode(mode: 'tools' | 'chat') {
  fireEvent.change(screen.getByRole('combobox', { name: 'AI 模式' }), {
    target: { value: mode },
  });
}

function resetStores() {
  localStorage.clear();
  sendMessageMock.mockReset();
  useAIWorkspaceStore.setState({
    mode: 'tools',
    isStreaming: false,
    streamingContent: '',
    conversations: {
      tools: { messages: [], recentExecutions: [], draft: '' },
      chat: { messages: [], recentExecutions: [], draft: '' },
    },
    archives: { tools: [], chat: [] },
  });
  // The product default is automatic execution for reversible local writes.
  // Confirmation-card tests explicitly opt into ask mode below.
  useAISettingsStore.setState({ executionMode: 'auto' });
  useKanbanStore.setState({ tasks: [] });
}

describe('AICommandCenter — full management loop', () => {
  beforeEach(resetStores);

  it('proposes a confirmation card and creates the task only after approval', async () => {
    useAISettingsStore.getState().setExecutionMode('ask');
    sendMessageMock.mockResolvedValueOnce({
      content: ACTION_REPLY,
      provider: 'mock',
      model: 'mock-model',
    });

    render(
      <MemoryRouter initialEntries={['/ai']}>
        <AICommandCenter />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByTestId('agent-composer-input'), {
      target: { value: '帮我创建一个高优先级任务：买牛奶' },
    });
    fireEvent.click(screen.getByRole('button', { name: '发送' }));

    // Assistant reply renders with a pending write-action card
    expect(await screen.findByText(/创建任务「买牛奶」/)).toBeInTheDocument();
    expect(screen.getByText('待确认')).toBeInTheDocument();
    // Not yet executed
    expect(useKanbanStore.getState().tasks.some((t) => t.title === '买牛奶')).toBe(false);

    // User approves
    fireEvent.click(screen.getByRole('button', { name: '确认执行' }));

    await waitFor(() => {
      const task = useKanbanStore.getState().tasks.find((t) => t.title === '买牛奶');
      expect(task?.priority).toBe('high');
    });
    expect(await screen.findByText('已执行')).toBeInTheDocument();
  });

  it('rejecting the card leaves data untouched', async () => {
    useAISettingsStore.getState().setExecutionMode('ask');
    sendMessageMock.mockResolvedValueOnce({
      content: ACTION_REPLY,
      provider: 'mock',
      model: 'mock-model',
    });

    render(
      <MemoryRouter initialEntries={['/ai']}>
        <AICommandCenter />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByTestId('agent-composer-input'), {
      target: { value: '删除一切' },
    });
    fireEvent.click(screen.getByRole('button', { name: '发送' }));
    await screen.findByText(/创建任务「买牛奶」/);

    fireEvent.click(screen.getByRole('button', { name: /忽略/ }));
    expect(await screen.findByText('已忽略')).toBeInTheDocument();
    await waitFor(() => {
      expect(useKanbanStore.getState().tasks.some((t) => t.title === '买牛奶')).toBe(false);
    });
  });

  it('auto mode executes a reversible local write without a confirmation round-trip', async () => {
    sendMessageMock.mockResolvedValueOnce({
      content: ACTION_REPLY,
      provider: 'mock',
      model: 'mock-model',
    });

    render(
      <MemoryRouter initialEntries={['/ai']}>
        <AICommandCenter />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByTestId('agent-composer-input'), {
      target: { value: '帮我创建一个高优先级任务：买牛奶' },
    });
    fireEvent.click(screen.getByRole('button', { name: '发送' }));

    await waitFor(() => {
      const task = useKanbanStore.getState().tasks.find((t) => t.title === '买牛奶');
      expect(task?.priority).toBe('high');
    });
    expect(screen.queryByText('待确认')).not.toBeInTheDocument();
    expect(await screen.findByText('已执行')).toBeInTheDocument();
  });

  it('read-only queries auto-execute without confirmation', async () => {
    useKanbanStore.setState({
      tasks: [
        {
          id: 't1',
          title: '高优任务',
          description: '',
          status: 'todo',
          created: new Date().toISOString(),
          startDate: null,
          dueDate: null,
          priority: 'high',
          tags: [],
          projectIds: [],
        },
      ],
    });
    sendMessageMock
      // Round 1: model asks for data via read-only tool
      .mockResolvedValueOnce({
        content:
          '让我查一下。\n```json\n{"actions":[{"tool":"list_tasks","params":{"priority":"high"}}]}\n```',
        provider: 'mock',
        model: 'mock-model',
      })
      // Round 2: model answers using injected query results
      .mockResolvedValueOnce({
        content: '你有一个高优先级任务：高优任务，建议今天先做它。',
        provider: 'mock',
        model: 'mock-model',
      });

    render(
      <MemoryRouter initialEntries={['/ai']}>
        <AICommandCenter />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByTestId('agent-composer-input'), {
      target: { value: '我今天该先做什么？' },
    });
    fireEvent.click(screen.getByRole('button', { name: '发送' }));

    // Final continuation answer lands in the transcript
    expect(await screen.findByText(/高优任务，建议今天先做它/)).toBeInTheDocument();
    expect(sendMessageMock).toHaveBeenCalledTimes(2);
  });

  it('chat mode renders JSON and action-like content without executing it', async () => {
    sendMessageMock.mockResolvedValueOnce({
      content: ACTION_REPLY,
      provider: 'mock',
      model: 'mock-model',
    });

    render(
      <MemoryRouter initialEntries={['/ai']}>
        <AICommandCenter />
      </MemoryRouter>
    );
    switchMode('chat');
    expect(screen.getByRole('combobox', { name: 'AI 模式' })).toHaveValue('chat');

    fireEvent.change(screen.getByTestId('agent-composer-input'), {
      target: { value: '请把这段 JSON 原样输出' },
    });
    fireEvent.click(screen.getByRole('button', { name: '发送' }));

    expect(await screen.findByText(/create_task/)).toBeInTheDocument();
    expect(screen.queryByText('待确认')).not.toBeInTheDocument();
    expect(useKanbanStore.getState().tasks).toHaveLength(0);
    const request = sendMessageMock.mock.calls[0][0];
    expect(request.systemPrompt).toContain('当前处于“聊天模式”');
    expect(request.systemPrompt).not.toContain('## 可用工具');
  });

  it('is hidden outside the canonical AI route', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AICommandCenter />
      </MemoryRouter>
    );
    expect(screen.queryByTestId('ai-command-center')).not.toBeInTheDocument();
  });

  it('links to provider management when the transcript is empty', async () => {
    render(
      <MemoryRouter initialEntries={['/ai']}>
        <AICommandCenter />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByLabelText('对话更多操作'));
    const link = await screen.findByText('管理提供商');
    expect(link).toHaveAttribute('href', '/settings?tab=ai');
    expect(screen.queryByText('在侧边面板中继续')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '收起 AI 指挥中心' })).not.toBeInTheDocument();
  });

  it('never calls scrollIntoView while sending/streaming (page must not jump)', async () => {
    // Regression: auto-follow used `scrollIntoView`, which scrolls every
    // ancestor including the window, yanking the whole Dashboard upward.
    // jsdom lacks the API entirely — stub it so any call is detectable.
    const proto = Element.prototype as unknown as Record<string, unknown>;
    const original = proto.scrollIntoView;
    proto.scrollIntoView = vi.fn();
    const spy = proto.scrollIntoView as ReturnType<typeof vi.fn>;
    try {
      sendMessageMock.mockResolvedValueOnce({
        content: '收到，已记录。',
        provider: 'mock',
        model: 'mock-model',
      });

      render(
        <MemoryRouter initialEntries={['/ai']}>
          <AICommandCenter />
        </MemoryRouter>
      );
      fireEvent.change(screen.getByTestId('agent-composer-input'), {
        target: { value: '防止页面跳动' },
      });
      fireEvent.click(screen.getByRole('button', { name: '发送' }));

      await screen.findByText('收到，已记录。');
      expect(spy).not.toHaveBeenCalled();
    } finally {
      if (original === undefined) delete proto.scrollIntoView;
      else proto.scrollIntoView = original;
    }
  });
});

describe('AICommandCenter — 工具/聊天会话独立管理（隔离 · 归档 · 删除）', () => {
  beforeEach(resetStores);

  const renderAI = () =>
    render(
      <MemoryRouter initialEntries={['/ai']}>
        <AICommandCenter />
      </MemoryRouter>
    );

  async function send(text: string) {
    fireEvent.change(screen.getByTestId('agent-composer-input'), {
      target: { value: text },
    });
    fireEvent.click(screen.getByRole('button', { name: '发送' }));
  }

  it('两种模式的对话互不可见，切回后原对话仍在', async () => {
    sendMessageMock.mockResolvedValueOnce({
      content: '工具模式回复',
      provider: 'mock',
      model: 'm',
    });
    renderAI();
    await send('工具模式的独白');
    expect(await screen.findByText('工具模式回复')).toBeInTheDocument();

    // Chat mode shows its OWN (empty) transcript, never the tool transcript.
    switchMode('chat');
    expect(screen.queryByText('工具模式回复')).not.toBeInTheDocument();
    expect(screen.queryByText('工具模式的独白')).not.toBeInTheDocument();

    // Switching back restores the tool-mode view untouched.
    switchMode('tools');
    expect(screen.getByText('工具模式回复')).toBeInTheDocument();
  });

  it('归档当前对话后画面清空，可从该模式的归档恢复', async () => {
    sendMessageMock.mockResolvedValueOnce({
      content: '待归档的回复',
      provider: 'mock',
      model: 'm',
    });
    renderAI();
    await send('归档我这段对话');
    expect(await screen.findByText('待归档的回复')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('ai-archive-current'));
    expect(screen.queryByText('待归档的回复')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('ai-toggle-archives'));
    const panel = await screen.findByTestId('ai-archive-panel');
    expect(panel).toHaveTextContent('工具模式归档（1）');
    expect(screen.getByText('归档我这段对话')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('ai-archive-restore'));
    fireEvent.click(await screen.findByRole('button', { name: /返回对话/ }));
    expect(await screen.findByText('待归档的回复')).toBeInTheDocument();
    expect(screen.queryByTestId('ai-archive-panel')).not.toBeInTheDocument();
  });

  it('删除归档需二次确认，且各模式归档完全隔离', async () => {
    sendMessageMock.mockResolvedValueOnce({
      content: '将被归档再删除',
      provider: 'mock',
      model: 'm',
    });
    renderAI();
    await send('工具模式要删的对话');
    await screen.findByText('将被归档再删除');
    fireEvent.click(screen.getByTestId('ai-archive-current'));

    // Chat mode's archive list is empty — tool archives must not leak in.
    switchMode('chat');
    fireEvent.click(screen.getByTestId('ai-toggle-archives'));
    expect(await screen.findByTestId('ai-archive-empty')).toHaveTextContent('聊天模式');
    expect(screen.queryByTestId('ai-archive-item')).not.toBeInTheDocument();

    // Back in tools mode the archive is still there; delete needs two clicks.
    switchMode('tools');
    fireEvent.click(screen.getByTestId('ai-toggle-archives'));
    expect((await screen.findByTestId('ai-archive-list')).textContent).toContain(
      '工具模式要删的对话'
    );

    fireEvent.click(screen.getByTestId('ai-archive-delete'));
    expect(screen.getByTestId('ai-archive-delete').textContent).toContain('确认删除');
    expect(screen.getByTestId('ai-archive-item')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('ai-archive-delete'));
    expect(screen.queryByTestId('ai-archive-item')).not.toBeInTheDocument();
    expect(screen.getByTestId('ai-archive-empty')).toBeInTheDocument();
  });

  it('清空当前对话只影响当前模式', async () => {
    sendMessageMock
      .mockResolvedValueOnce({ content: '工具A', provider: 'mock', model: 'm' })
      .mockResolvedValueOnce({ content: '聊天B', provider: 'mock', model: 'm' });

    renderAI();
    await send('工具消息');
    await screen.findByText('工具A');

    switchMode('chat');
    await send('聊天消息');
    await screen.findByText('聊天B');

    fireEvent.click(screen.getByTestId('ai-clear-current'));
    expect(screen.queryByText('聊天B')).not.toBeInTheDocument();

    switchMode('tools');
    expect(screen.getByText('工具A')).toBeInTheDocument();
  });
});
