/**
 * AI Runtime Hook
 *
 * Unified chat kernel shared by the Dashboard AI 指挥中心 and the global
 * AI side panel. Owns the complete agent turn lifecycle on top of the
 * multi-provider router:
 *
 *   send → stream reply → parse action payloads →
 *     ├─ read-only tools: auto-execute locally → feed results back →
 *     │  continue the turn (bounded rounds)
 *     └─ write tools: render confirmation cards → execute only after
 *        explicit user approval
 */

import { useCallback, useEffect, useState } from 'react';
import { createDefaultRouter } from '../services/ai/providerRouter';
import type { AIResponse } from '../services/ai/types';
import {
  buildAgentSystemPrompt,
  buildChatSystemPrompt,
  buildQueryResultsSection,
  buildTodaySnapshot,
} from '../services/ai/agent/promptBuilder';
import { parseAgentReply, historyForProvider } from '../services/ai/agent/actionParser';
import { executeAgentAction } from '../services/ai/agent/executor';
import { undoAgentOperation } from '../services/ai/agent/undo';
import { AGENT_TOOLS } from '../services/ai/agent/tools';
import { toolDestination } from '../services/ai/agent/capabilityMeta';
import type {
  ActionResult,
  AITraceEntry,
  ProposedAction,
} from '../services/ai/agent/types';
import {
  locateAIMessage,
  useAIWorkspaceStore,
} from '../stores/useAIWorkspaceStore';
import type { AIWorkspaceMode } from '../stores/useAIWorkspaceStore';
import { useAISettingsStore } from '../stores/useAISettingsStore';
import {
  entityKindLabel,
  useAIOperationLogStore,
} from '../stores/useAIOperationLogStore';
import { toast } from '../stores/useToastStore';
import { useTerminalStore } from '../stores/useTerminalStore';
import { logger } from '../services/logger';

const log = logger.module('useAIRuntime');

/** Max consecutive read-query→continue rounds per user message (loop guard). */
const MAX_AGENT_TOOL_ROUNDS = 3;

/** Provider request timeout — stream must end (or fail) within this window. */
const PROVIDER_TIMEOUT_MS = 120_000;

/** Write tools that always require explicit confirmation, even in auto mode. */
const AUTO_MODE_DEFERRED_TOOLS = new Set<string>([
  'delete_task',
  'delete_event',
  'delete_note',
  'delete_time_entry',
  'delete_routine',
]);

const AI_MODES: readonly AIWorkspaceMode[] = ['tools', 'chat'] as const;

/** Reject a provider call that takes longer than `ms` (hung streams must
 * never leave the workspace stuck on 「思考中…」). */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('请求超时')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

/** Active mode's messages snapshot (for prompt history). Module-level so its
 * identity is stable for useCallback dependency lists. */
function getActiveMessages() {
  const ws = useAIWorkspaceStore.getState();
  return ws.conversations[ws.mode].messages;
}

interface TurnParams {
  /** The prompt text sent to the provider for this round. */
  turnPrompt: string;
  /** Prior conversation (excludes the current prompt). */
  history: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  /** Read-query outputs from the immediately preceding round. */
  queryResults?: Array<{ tool: ProposedAction['tool']; message: string }>;
  /** Accumulated read-query trace of this turn (attached to the final answer). */
  trace?: AITraceEntry[];
  depth: number;
  mode: AIWorkspaceMode;
}

export function useAIRuntime() {
  const [configuredProviderCount, setConfiguredProviderCount] = useState<number | null>(null);

  // Shared transcript state — scoped to the ACTIVE mode so tool-mode and
  // chat-mode conversations never mix. Pending action cards remain
  // actionable across modes (see locateAIMessage / cross-mode updates).
  const mode = useAIWorkspaceStore((s) => s.mode);
  const messages = useAIWorkspaceStore((s) => s.conversations[s.mode].messages);
  const archives = useAIWorkspaceStore((s) => s.archives[s.mode]);
  const inputDraft = useAIWorkspaceStore((s) => s.conversations[s.mode].draft);
  const isStreaming = useAIWorkspaceStore((s) => s.isStreaming);
  const streamingContent = useAIWorkspaceStore((s) => s.streamingContent);
  const setInputDraft = useAIWorkspaceStore((s) => s.setInputDraft);
  const clearConversation = useAIWorkspaceStore((s) => s.clearConversation);
  const archiveConversation = useAIWorkspaceStore((s) => s.archiveConversation);
  const restoreConversation = useAIWorkspaceStore((s) => s.restoreConversation);
  const deleteArchivedConversation = useAIWorkspaceStore(
    (s) => s.deleteArchivedConversation
  );
  const clearArchives = useAIWorkspaceStore((s) => s.clearArchives);
  const setMode = useAIWorkspaceStore((s) => s.setMode);

  // Provider configuration lives in the terminal store (shared with AITerminal & Settings)
  const activeProvider = useTerminalStore((s) => s.activeProvider);
  const activeModel = useTerminalStore((s) => s.activeModel);
  const providers = useTerminalStore((s) => s.providers);
  const enableCrossModuleContext = useTerminalStore((s) => s.enableCrossModuleContext);
  const customInstructions = useTerminalStore((s) => s.customInstructions);

  const [router] = useState(() =>
    createDefaultRouter((failedProvider, _failedModel, nextProvider, nextModel, reason) => {
      log.warn('Provider fallback', { failedProvider, nextProvider, nextModel, reason });
    })
  );

  useEffect(() => {
    router.updateConfig({
      primaryProvider: activeProvider,
      primaryModel: activeModel,
      fallbackEnabled: true,
    });
  }, [activeProvider, activeModel, router]);

  // Restore API keys into the router (keys decrypt with the device-managed
  // local key — no password involved)
  useEffect(() => {
    const initializeApiKeys = async () => {
      const allProviderIds = Object.keys(router.getAllProviderMetadata());
      for (const providerId of allProviderIds) {
        const providerConfig = providers[providerId];
        if (providerConfig && providerConfig.encryptedApiKey) {
          try {
            const decryptedKey = await useTerminalStore
              .getState()
              .getProviderApiKey(providerId);
            if (decryptedKey) {
              router.setProviderApiKey(providerId, decryptedKey);
            }
          } catch (error) {
            log.error(`Failed to decrypt ${providerId} API key`, { error });
          }
        }
      }
      try {
        const configured = await router.getConfiguredProviders();
        setConfiguredProviderCount(configured.length);
      } catch (error) {
        log.error('Failed to count configured providers', { error });
        setConfiguredProviderCount(0);
      }
    };
    initializeApiKeys();
  }, [providers, router]);

  // ────────────────────────────────────────────── agent turn

  /** Record one executed action into the audit log (view/undo panel). */
  const recordOperation = useCallback(
    (
      action: ProposedAction,
      result: ActionResult,
      source: 'auto' | 'confirmed'
    ): string | null => {
      if (!useAISettingsStore.getState().logEnabled) return null;
      const summary = result.message || action.summary;
      return useAIOperationLogStore.getState().addRecord({
        tool: action.tool,
        summary,
        success: result.success,
        source,
        entityKind: entityKindLabel(action.tool),
        refId: result.refId,
        destination: toolDestination(action.tool, action.params, result) ?? undefined,
        undo: result.undo,
      });
    },
    []
  );

  /**
   * Execute one write action end-to-end: card lifecycle → store →
   * execution feedback → audit log → toast. Shared by manual confirm and
   * auto-execution so both paths behave identically.
   */
  const performAction = useCallback(
    async (
      messageId: string,
      action: ProposedAction,
      source: 'auto' | 'confirmed'
    ): Promise<ActionResult> => {
      const ws = useAIWorkspaceStore.getState();
      ws.updateAction(messageId, action.id, { status: 'executing', source });
      const result: ActionResult = await executeAgentAction(action.tool, action.params);
      const logId = recordOperation(action, result, source);
      ws.updateAction(messageId, action.id, {
        status: result.success ? 'executed' : 'failed',
        result,
        logId: logId ?? undefined,
      });
      // Execution feedback belongs to the conversation that proposed the
      // action — even if the user is currently viewing the other mode.
      const ownerMode = locateAIMessage(ws, messageId)?.mode ?? ws.mode;
      ws.recordExecutions(
        [
          {
            tool: action.tool,
            summary: result.message || action.summary,
            success: result.success,
            at: Date.now(),
          },
        ],
        ownerMode
      );
      if (result.success) {
        toast.success(result.message || '操作已执行');
      } else {
        toast.error(result.message || '操作执行失败');
      }
      return result;
    },
    [recordOperation]
  );

  const runTurn = useCallback(
    async (params: TurnParams): Promise<void> => {
      const ws = useAIWorkspaceStore.getState();
      const executions = ws.conversations[params.mode].recentExecutions;
      const aiSettings = useAISettingsStore.getState();

      let systemPrompt = params.mode === 'chat'
        ? buildChatSystemPrompt({
            includeCrossModuleContext: enableCrossModuleContext,
            customInstructions,
          })
        : buildAgentSystemPrompt({
            executions,
            includeCrossModuleContext: enableCrossModuleContext,
            customInstructions,
            todaySnapshot: aiSettings.todaySnapshotEnabled ? buildTodaySnapshot() : undefined,
            executionMode: aiSettings.executionMode,
          });
      if (params.mode === 'tools' && params.queryResults && params.queryResults.length > 0) {
        systemPrompt += buildQueryResultsSection(params.queryResults);
      }

      // ── Ask the provider (bounded by a hard timeout so a hung stream
      //    can never leave the workspace stuck at 「思考中…」). ──
      let response: AIResponse;
      try {
        response = await withTimeout(
          router.sendMessage({
            prompt: params.turnPrompt,
            conversationHistory: params.history,
            systemPrompt,
            stream: true,
            onChunk: (chunk) => useAIWorkspaceStore.getState().appendStreamingChunk(chunk),
          }),
          PROVIDER_TIMEOUT_MS
        );
      } catch (error) {
        throw new Error(
          error instanceof Error && error.message.includes('超时')
            ? 'AI 响应超时，请重试；若频繁超时可更换提供商或稍后再试。'
            : (error instanceof Error ? error.message : String(error))
        );
      }

      if (params.mode === 'chat') {
        ws.addMessage({
          role: 'assistant',
          content: response.content || '（模型返回了空回复，请重试或换个说法。）',
          provider: response.provider,
          model: response.model,
        });
        return;
      }

      const parsed = parseAgentReply(response.content, {
        strictToolSweep: true,
        suppressFailedReads: true,
      });

      // ── Read-query probes auto-execute; if any succeeded the turn
      //    continues with the results (bounded rounds). ──
      const readActions = parsed.actions.filter(
        (a) => a.status === 'pending' && AGENT_TOOLS[a.tool]?.risk === 'read'
      );

      // ── Write actions follow the execution authority (ask / auto / readonly) ──
      const pendingWrites = parsed.actions.filter(
        (a) => a.status === 'pending' && AGENT_TOOLS[a.tool]?.risk === 'write'
      );
      const executionMode = useAISettingsStore.getState().executionMode;

      const willContinue =
        readActions.length > 0 && params.depth < MAX_AGENT_TOOL_ROUNDS;
      // Intermediate probe rounds are hidden from the transcript when they
      // carry no write cards — the final answer shows a compact trace instead.
      const transient = willContinue && pendingWrites.length === 0;

      const messageId = ws.addMessage({
        role: 'assistant',
        content:
          parsed.cleanedText ||
          (parsed.actions.length > 0 ? '' : '（模型返回了空回复，请重试或换个说法。）'),
        actions: parsed.actions.length > 0 ? parsed.actions : undefined,
        provider: response.provider,
        model: response.model,
        transient,
        unverifiedExecutionClaim: parsed.unverifiedExecutionClaim,
      });

      const currentWs = useAIWorkspaceStore.getState();

      if (executionMode === 'readonly' && pendingWrites.length > 0) {
        for (const action of pendingWrites) {
          currentWs.updateAction(messageId, action.id, {
            status: 'blocked',
            result: {
              success: false,
              message: '只读模式已拦截写操作。切换到「询问确认」或「自动执行」后即可执行。',
            },
          });
        }
      } else if (executionMode === 'auto' && pendingWrites.length > 0) {
        for (const action of pendingWrites) {
          // Deleting is never silent: even in auto mode, deletion cards stay
          // pending until the user approves them explicitly.
          if (AUTO_MODE_DEFERRED_TOOLS.has(action.tool)) continue;
          // Sequential execution keeps card order identical to the model's proposal.
          const result = await performAction(messageId, action, 'auto');
          if (!result.success) {
            // A failed auto-execution should not silently continue chain actions
            // that depend on it; let the model see the failure in the next round.
            log.warn('Auto-executed action failed', { tool: action.tool, result });
          }
        }
      }

      const results: Array<{ tool: ProposedAction['tool']; message: string }> = [];
      for (const action of readActions) {
        currentWs.updateAction(messageId, action.id, { status: 'executing' });
        const result: ActionResult = await executeAgentAction(action.tool, action.params);
        currentWs.updateAction(messageId, action.id, {
          status: result.success ? 'executed' : 'failed',
          result,
        });
        results.push({ tool: action.tool, message: result.message });
      }
      const trace: AITraceEntry[] = [
        ...(params.trace ?? []),
        ...results.map((r) => ({
          tool: r.tool as ProposedAction['tool'],
          label: AGENT_TOOLS[r.tool as keyof typeof AGENT_TOOLS]?.label ?? String(r.tool),
          summary: r.message.split('\n')[0].slice(0, 80),
          detail: r.message,
          ok: true,
        })),
      ];

      if (readActions.length === 0) {
        // Final answer of the turn: attach the process trace (if any).
        if (trace.length > 0) {
          currentWs.updateMessage(messageId, { trace });
        }
        return;
      }

      if (params.depth >= MAX_AGENT_TOOL_ROUNDS) {
        currentWs.updateMessage(messageId, {
          content: `${parsed.cleanedText}\n\n（连续查询轮次已达上限 ${MAX_AGENT_TOOL_ROUNDS}，请基于以上结果继续提问。）`.trim(),
          trace,
        });
        return;
      }

      await runTurn({
        // Query results are injected via the system prompt; instruct the
        // model to answer directly instead of narrating its next step.
        turnPrompt:
          '（系统已自动执行你上一轮的查询工具，结果见系统提示中的「系统查询结果」。请基于结果直接给出最终回答——不要复述用户的请求，不要再次查询，不要解释你将做什么，直接输出答案及其中的工具动作块。）',
        history: historyForProvider(getActiveMessages().filter((m) => !m.transient)),
        queryResults: results,
        trace,
        depth: params.depth + 1,
        mode: params.mode,
      });
    },
    [customInstructions, enableCrossModuleContext, router]
  );

  // ────────────────────────────────────────────── public API

  const sendMessage = useCallback(
    async (text?: string) => {
      const ws = useAIWorkspaceStore.getState();
      const trimmed = (text ?? ws.conversations[ws.mode].draft).trim();
      if (!trimmed || ws.isStreaming) return;

      if (configuredProviderCount === 0) {
        ws.setInputDraft('');
        ws.addMessage({ role: 'user', content: trimmed });
        ws.addMessage({
          role: 'assistant',
          content:
            '尚未配置 AI 提供商。请前往 **设置 → AI 提供商** 添加 API 密钥后再使用管理助手。',
          isError: false,
        });
        return;
      }

      // History must exclude the user message we are about to send.
      // Only the ACTIVE mode's transcript is used — modes never share context.
      const history = historyForProvider(ws.conversations[ws.mode].messages);
      ws.setInputDraft('');
      ws.addMessage({ role: 'user', content: trimmed });
      ws.setStreaming(true);
      ws.resetStreamingContent();

      try {
        await runTurn({ turnPrompt: trimmed, history, depth: 0, mode });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '发生未知错误';
        log.error('Agent request failed', { error: errorMessage });
        useAIWorkspaceStore.getState().addMessage({
          role: 'assistant',
          content: `请求失败：${errorMessage}`,
          isError: true,
        });
      } finally {
        const finalWs = useAIWorkspaceStore.getState();
        finalWs.setStreaming(false);
        finalWs.resetStreamingContent();
      }
    },
    [configuredProviderCount, mode, runTurn]
  );

  const executeConfirmedAction = useCallback(
    (messageId: string, action: ProposedAction) => {
      const ws = useAIWorkspaceStore.getState();
      ws.updateAction(messageId, action.id, { status: 'executing' });
      void performAction(messageId, action, 'confirmed');
    },
    [performAction]
  );

  /** Confirm one proposed write action. */
  const confirmAction = useCallback(
    (messageId: string, actionId: string) => {
      const ws = useAIWorkspaceStore.getState();
      const message = locateAIMessage(ws, messageId)?.message;
      const action = message?.actions?.find((a) => a.id === actionId);
      if (!action || action.status !== 'pending') return;
      executeConfirmedAction(messageId, action);
    },
    [executeConfirmedAction]
  );

  /** Confirm every pending write action on one assistant message. */
  const confirmAllPending = useCallback(
    (messageId: string) => {
      const ws = useAIWorkspaceStore.getState();
      const message = locateAIMessage(ws, messageId)?.message;
      if (!message?.actions) return;
      for (const action of message.actions) {
        if (action.status === 'pending') {
          executeConfirmedAction(messageId, action);
        }
      }
    },
    [executeConfirmedAction]
  );

  /** Dismiss one proposed action without executing it. */
  const rejectAction = useCallback((messageId: string, actionId: string) => {
    useAIWorkspaceStore.getState().updateAction(messageId, actionId, { status: 'rejected' });
  }, []);

  /** Reverse one audit-log record (best effort, same store APIs). */
  const undoOperation = useCallback(async (recordId: string) => {
    const logStore = useAIOperationLogStore.getState();
    const record = logStore.records.find((r) => r.id === recordId);
    if (!record) return { success: false as const, message: '记录不存在' };
    if (record.undone) return { success: false as const, message: '该操作已被撤销' };
    if (!record.undo) return { success: false as const, message: '该操作不支持撤销' };
    const result = await undoAgentOperation(record.undo);
    if (result.success) {
      logStore.markUndone(recordId);
      toast.success(`已撤销：${record.summary}`);
    } else {
      toast.error(result.message || '撤销失败');
    }
    return result;
  }, []);

  /** Undo one executed action card via its audit-log linkage. */
  const undoAction = useCallback(
    (messageId: string, actionId: string) => {
      const ws = useAIWorkspaceStore.getState();
      const message = locateAIMessage(ws, messageId)?.message;
      const action = message?.actions?.find((a) => a.id === actionId);
      if (!action?.logId) return;
      void undoOperation(action.logId);
    },
    [undoOperation]
  );

  // Execution authority (ask / auto / readonly), persisted per user preference.
  const executionMode = useAISettingsStore((s) => s.executionMode);
  const setExecutionMode = useAISettingsStore((s) => s.setExecutionMode);

  // Pending write cards are counted across BOTH modes so a card proposed in
  // tool mode is never forgotten after switching to chat mode (and back).
  const pendingWriteCount = useAIWorkspaceStore((s) =>
    AI_MODES.reduce(
      (acc, modeKey) =>
        acc +
        s.conversations[modeKey].messages.reduce(
          (inner, m) =>
            inner +
            (m.actions?.filter(
              (a) => a.status === 'pending' && AGENT_TOOLS[a.tool]?.risk === 'write'
            ).length ?? 0),
          0
        ),
      0
    )
  );

  return {
    messages,
    mode,
    archives,
    setMode,
    isStreaming,
    streamingContent,
    inputDraft,
    setInputDraft,
    sendMessage,
    confirmAction,
    confirmAllPending,
    rejectAction,
    clearConversation,
    archiveConversation,
    restoreConversation,
    deleteArchivedConversation,
    clearArchives,
    pendingWriteCount,
    configuredProviderCount,
    activeProvider,
    activeModel,
    enableCrossModuleContext,
    executionMode,
    setExecutionMode,
    undoOperation,
    undoAction,
    needsSetup: configuredProviderCount === 0,
  };
}

export type AIRuntime = ReturnType<typeof useAIRuntime>;
