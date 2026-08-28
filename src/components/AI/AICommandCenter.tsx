/**
 * Canonical AI workspace. Tool mode manages local LifeOS data through
 * confirm-first actions; chat mode returns unrestricted generated content
 * and never interprets the response as an application command.
 *
 * Layout: quiet header · transcript · composer · optional operation history.
 * Capability inventory and snapshots stay behind the assistant instead of
 * competing with the conversation for attention.
 */

import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Archive,
  ArchiveRestore,
  ArrowUpRight,
  Bot,
  CheckSquare,
  Database,
  FileText,
  History,
  ListChecks,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { formatDateTime } from '../../utils/dateFormatting';
import { useAIRuntime } from '../../hooks/useAIRuntime';
import type { ArchivedAIConversation } from '../../stores/useAIWorkspaceStore';
import { useAIOperationLogStore } from '../../stores/useAIOperationLogStore';
import {
  AI_EXECUTION_MODE_DESCRIPTIONS,
  AI_EXECUTION_MODE_LABELS,
  useAISettingsStore,
  type AIExecutionMode,
} from '../../stores/useAISettingsStore';
import { AgentComposer } from './AgentComposer';
import { AgentMessageList } from './AgentMessageList';
import { AIOperationLogPanel } from './AIOperationLogPanel';
import { useAITodaySnapshot } from './useAITodaySnapshot';
import { AGENT_QUICK_PROMPTS, CHAT_QUICK_PROMPTS, type QuickPrompt } from './quickPrompts';
import {
  AGENT_CATEGORY_LABELS,
  AGENT_CATEGORY_ORDER,
  toolCategory,
} from '../../services/ai/agent/capabilityMeta';
import { AGENT_TOOLS } from '../../services/ai/agent/tools';

const EXECUTION_MODES: AIExecutionMode[] = ['ask', 'auto', 'readonly'];

function ExecutionModeControl() {
  const executionMode = useAISettingsStore((s) => s.executionMode);
  const setExecutionMode = useAISettingsStore((s) => s.setExecutionMode);
  const modeIcon = {
    ask: <ShieldCheck className="h-3.5 w-3.5" />,
    auto: <Zap className="h-3.5 w-3.5" />,
    readonly: <ShieldAlert className="h-3.5 w-3.5" />,
  }[executionMode];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1.5 rounded-full bg-surface-light-elevated px-2.5 py-1 text-xs text-text-light-secondary dark:bg-surface-dark-elevated dark:text-text-dark-secondary">
        {modeIcon}
        {AI_EXECUTION_MODE_DESCRIPTIONS[executionMode]}
      </span>
      <div
        role="group"
        aria-label="AI 执行权限"
        className="grid grid-cols-3 rounded-xl border border-border-light bg-surface-light-elevated/70 p-0.5 dark:border-border-dark dark:bg-surface-dark-elevated/70"
      >
        {EXECUTION_MODES.map((mode) => (
          <button
            key={mode}
            type="button"
            data-testid={`ai-exec-${mode}`}
            aria-pressed={executionMode === mode}
            onClick={() => setExecutionMode(mode)}
            title={AI_EXECUTION_MODE_DESCRIPTIONS[mode]}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all ${
              executionMode === mode
                ? 'bg-accent-primary text-white shadow-sm'
                : 'text-text-light-secondary hover:text-text-light-primary dark:text-text-dark-secondary dark:hover:text-text-dark-primary'
            }`}
          >
            {AI_EXECUTION_MODE_LABELS[mode]}
          </button>
        ))}
      </div>
    </div>
  );
}

/** 今日概览 mini-cards: privacy-safe counts, clicking jumps to the module. */
function TodaySnapshotRail() {
  const snapshot = useAITodaySnapshot();
  const cards = [
    {
      icon: CheckSquare,
      label: '任务',
      value: snapshot.tasksActive,
      hint: snapshot.tasksOverdue
        ? `逾期 ${snapshot.tasksOverdue}`
        : snapshot.tasksDueToday
          ? `今日到期 ${snapshot.tasksDueToday}`
          : snapshot.tasksInProgress
            ? `进行中 ${snapshot.tasksInProgress}`
            : '无进行中',
      to: '/tasks',
      tone: snapshot.tasksOverdue > 0 ? 'text-accent-red' : 'text-accent-blue',
    },
    {
      icon: FileText,
      label: '日程',
      value: snapshot.eventsToday,
      hint: `未来 3 天 ${snapshot.eventsUpcoming}`,
      to: '/schedule',
      tone: 'text-accent-cyan',
    },
    {
      icon: ListChecks,
      label: '习惯',
      value: snapshot.habitsPending,
      hint: `已完成 ${snapshot.habitsCompleted}`,
      to: '/habits',
      tone: 'text-accent-green',
    },
    {
      icon: Database,
      label: snapshot.timerActive ? '计时中' : '精力',
      value: snapshot.timerActive ? 1 : snapshot.energyToday,
      hint: snapshot.timerActive ? snapshot.timerDescription ?? '进行中' : '今日记录',
      to: '/schedule',
      tone: snapshot.timerActive ? 'text-accent-purple' : 'text-accent-orange',
    },
  ];
  return (
    <section aria-label="今日概览">
      <div className="grid grid-cols-2 gap-2">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              to={card.to}
              className="group rounded-xl border border-border-light bg-surface-light px-3 py-2.5 transition-all hover:border-accent-primary/50 hover:shadow-sm dark:border-border-dark dark:bg-surface-dark"
            >
              <div className="flex items-center gap-1.5 text-[11px] text-text-light-tertiary dark:text-text-dark-tertiary">
                <Icon className={`h-3 w-3 ${card.tone}`} />
                <span>{card.label}</span>
              </div>
              <p className={`mt-0.5 text-xl font-bold leading-none ${card.tone}`}>{card.value}</p>
              <p className="mt-1 truncate text-[10px] text-text-light-secondary dark:text-text-dark-secondary">
                {card.hint}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/** Grouped capability coverage: what this AI can actually operate. */
function CapabilityRail() {
  const groups = AGENT_CATEGORY_ORDER.map((category) => {
    const tools = Object.values(AGENT_TOOLS).filter((t) => toolCategory(t.id) === category);
    return { category, tools };
  }).filter((g) => g.tools.length > 0);

  return (
    <section aria-label="能力覆盖">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-light-tertiary dark:text-text-dark-tertiary">
        可管理的数据域
      </p>
      <ul className="mt-2 space-y-1">
        {groups.map(({ category, tools }) => (
          <li key={category}>
            <div className="flex items-center justify-between rounded-lg px-2 py-1 text-xs">
              <span className="font-medium text-text-light-secondary dark:text-text-dark-secondary">
                {AGENT_CATEGORY_LABELS[category]}
              </span>
              <span className="rounded-full bg-surface-light-elevated px-1.5 py-0.5 text-[10px] text-text-light-tertiary dark:bg-surface-dark-elevated dark:text-text-dark-tertiary">
                {tools.length}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function QuickPromptChips({
  prompts,
  onSend,
}: {
  prompts: QuickPrompt[];
  onSend: (text: string) => void;
}) {
  return (
    <div className="grid gap-1.5">
      {prompts.map((qp) => (
        <button
          key={qp.label}
          type="button"
          onClick={() => onSend(qp.prompt)}
          title={qp.prompt}
          className="flex items-center gap-2 rounded-xl border border-border-light bg-surface-light px-3 py-2 text-left text-xs font-medium text-text-light-secondary transition-all hover:border-accent-primary/50 hover:text-accent-primary dark:border-border-dark dark:bg-surface-dark dark:text-text-dark-secondary"
        >
          <Sparkles className="h-3 w-3 shrink-0 text-accent-primary" />
          {qp.label}
        </button>
      ))}
    </div>
  );
}

const TOOL_DESTINATIONS = [
  { label: '任务', to: '/tasks' },
  { label: '日程', to: '/schedule' },
  { label: '笔记', to: '/notes' },
  { label: '项目', to: '/pm' },
  { label: '收藏', to: '/links' },
  { label: '自动化', to: '/automations' },
  { label: '习惯', to: '/habits' },
  { label: '精力', to: '/energy' },
];

const AICommandCenterWorkspace: React.FC = () => {
  const {
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
    rejectAction,
    undoAction,
    clearConversation,
    archiveConversation,
    restoreConversation,
    deleteArchivedConversation,
    clearArchives,
    pendingWriteCount,
    needsSetup,
    activeProvider,
    activeModel,
    enableCrossModuleContext,
    undoOperation,
  } = useAIRuntime();

  const isToolMode = mode === 'tools';
  const modeLabel = isToolMode ? '工具模式' : '聊天模式';
  const opLogCount = useAIOperationLogStore((s) => s.records.length);

  // Archive drawer shows ONLY the active mode's archived conversations.
  const [showArchives, setShowArchives] = useState(false);
  const [showOperationLog, setShowOperationLog] = useState(false);
  /** Two-step destructive confirmation: id of the row awaiting a second click, or '__all__'. */
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Switching modes must never carry the other mode's archive view along.
  useEffect(() => {
    setShowArchives(false);
    setPendingDeleteId(null);
  }, [mode]);

  const toggleArchives = () => {
    setShowArchives((open) => !open);
    setPendingDeleteId(null);
  };

  const handleArchiveCurrent = () => {
    if (archiveConversation()) setPendingDeleteId(null);
  };

  const handleDeleteArchive = (item: ArchivedAIConversation) => {
    if (pendingDeleteId === item.id) {
      deleteArchivedConversation(mode, item.id);
      setPendingDeleteId(null);
    } else {
      setPendingDeleteId(item.id);
    }
  };

  const handleClearArchives = () => {
    const sentinel = '__all__';
    if (pendingDeleteId === sentinel) {
      clearArchives();
      setPendingDeleteId(null);
    } else {
      setPendingDeleteId(sentinel);
    }
  };

  return (
    <section
      data-testid="ai-command-center"
      aria-label="AI 指挥中心"
      className="flex min-h-[32rem] flex-1 flex-col overflow-hidden rounded-2xl border border-border-light bg-surface-light dark:border-border-dark dark:bg-surface-dark"
    >
      {/* ── Header ── */}
      <header className="border-b border-border-light bg-surface-light px-4 py-3 dark:border-border-dark dark:bg-surface-dark sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-primary/10 text-accent-primary">
              <Sparkles className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold text-text-light-primary dark:text-text-dark-primary sm:text-lg">
                  AI 工作区
                </h2>
                <span className="hidden items-center gap-1 rounded-full border border-border-light bg-surface-light/70 px-2 py-0.5 text-[11px] text-text-light-secondary dark:border-border-dark dark:bg-surface-dark/70 dark:text-text-dark-secondary sm:flex">
                  <Bot className="h-3 w-3" />
                  {needsSetup ? '未配置提供商' : `${activeProvider} · ${activeModel}`}
                </span>
                {pendingWriteCount > 0 && (
                  <span
                    data-testid="pending-write-badge"
                    className="rounded-full bg-accent-yellow/15 px-2 py-0.5 text-xs font-medium text-accent-yellow"
                  >
                    {pendingWriteCount} 项待确认
                  </span>
                )}
              </div>
              <p className="mt-0.5 max-w-[34rem] truncate text-xs text-text-light-secondary dark:text-text-dark-secondary sm:text-sm">
                {needsSetup
                  ? '配置提供商后即可开始；API 密钥只在本机加密保存'
                  : '本机 AI 管理副驾 · 替你操作，结果可查可撤销'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-testid="ai-open-operation-log"
              onClick={() => setShowOperationLog(true)}
              title="查看 AI 操作记录（可撤销）"
              className="flex items-center gap-1.5 rounded-xl border border-border-light bg-surface-light-elevated/80 px-3 py-1.5 text-xs font-medium text-text-light-secondary transition-all hover:border-accent-primary/50 hover:text-accent-primary dark:border-border-dark dark:bg-surface-dark-elevated/80 dark:text-text-dark-secondary"
            >
              <History className="h-3.5 w-3.5" />
              操作记录
              {opLogCount > 0 && (
                <span className="rounded-full bg-accent-primary/10 px-1.5 text-[10px] font-semibold text-accent-primary">
                  {opLogCount}
                </span>
              )}
            </button>

            <label className="flex items-center gap-2 rounded-xl border border-border-light bg-surface-light px-2.5 py-1.5 text-xs text-text-light-secondary dark:border-border-dark dark:bg-surface-dark dark:text-text-dark-secondary">
              <span className="sr-only">AI 模式</span>
              <select
                value={mode}
                onChange={(event) => setMode(event.target.value as typeof mode)}
                disabled={isStreaming}
                className="bg-transparent text-xs font-medium text-text-light-primary outline-none disabled:opacity-60 dark:text-text-dark-primary sm:text-sm"
                aria-label="AI 模式"
              >
                <option value="tools">管理 LifeOS</option>
                <option value="chat">普通聊天</option>
              </select>
            </label>
          </div>
        </div>

        <details className="mt-2 text-xs text-text-light-secondary dark:text-text-dark-secondary">
          <summary className="cursor-pointer select-none text-text-light-tertiary hover:text-accent-primary dark:text-text-dark-tertiary">
            权限与上下文
          </summary>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-lg bg-surface-light-elevated px-2.5 py-1 dark:bg-surface-dark-elevated">
              <Database className="h-3.5 w-3.5" />
              自动上下文：{enableCrossModuleContext ? '已开启' : '已关闭'}
            </span>
            <ExecutionModeControl />
          </div>
        </details>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* ── Left rail: today snapshot + quick prompts + capabilities ── */}
        <aside className="hidden">
          <TodaySnapshotRail />

          {isToolMode && (
            <section aria-label="快捷指令">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-light-tertiary dark:text-text-dark-tertiary">
                快捷指令
              </p>
              <div className="mt-2">
                <QuickPromptChips prompts={AGENT_QUICK_PROMPTS} onSend={(text) => sendMessage(text)} />
              </div>
            </section>
          )}

          <CapabilityRail />

          <div className="mt-auto space-y-2 border-t border-border-light pt-4 dark:border-border-dark">
            {isToolMode && (
              <div className="flex flex-wrap gap-1.5">
                {TOOL_DESTINATIONS.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="rounded-lg border border-border-light px-2 py-1 text-xs text-text-light-secondary transition-colors hover:border-accent-primary hover:text-accent-primary dark:border-border-dark dark:text-text-dark-secondary"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
            <Link
              to="/settings?tab=ai"
              className="flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium text-accent-primary transition-colors hover:bg-accent-primary/5"
            >
              AI 提供商与隐私
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </aside>

        {/* ── Main column ── */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {showArchives ? (
            <div
              data-testid="ai-archive-panel"
              className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6"
            >
              <div className="mx-auto max-w-3xl">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
                    {modeLabel}归档（{archives.length}）
                  </h3>
                  <div className="flex items-center gap-3 text-xs">
                    {archives.length > 0 && (
                      <button
                        type="button"
                        data-testid="ai-archive-clear-all"
                        onClick={handleClearArchives}
                        className={`transition-colors ${
                          pendingDeleteId === '__all__'
                            ? 'font-semibold text-accent-red'
                            : 'text-text-light-tertiary hover:text-accent-red dark:text-text-dark-tertiary'
                        }`}
                      >
                        {pendingDeleteId === '__all__' ? '确认全部删除？' : '全部删除'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={toggleArchives}
                      className="flex items-center gap-1 rounded-lg px-2 py-1 font-medium text-accent-primary transition-colors hover:bg-accent-primary/5"
                    >
                      <X className="h-3.5 w-3.5" />
                      返回对话
                    </button>
                  </div>
                </div>

                <p className="mt-1 text-xs text-text-light-secondary dark:text-text-dark-secondary">
                  归档与{modeLabel}的对话分开保存；切换到另一模式时不会看到这里的记录。
                </p>

                {archives.length === 0 ? (
                  <div
                    data-testid="ai-archive-empty"
                    className="mt-6 rounded-2xl border border-dashed border-border-light bg-surface-light-elevated/50 p-8 text-center text-sm text-text-light-secondary dark:border-border-dark dark:bg-surface-dark-elevated/50 dark:text-text-dark-secondary"
                  >
                    暂无{modeLabel}归档对话。点击下方「归档当前对话」即可把现在的对话收进这里。
                  </div>
                ) : (
                  <ul className="mt-4 space-y-2" data-testid="ai-archive-list">
                    {archives.map((item) => {
                      const confirming = pendingDeleteId === item.id;
                      return (
                        <li
                          key={item.id}
                          data-testid="ai-archive-item"
                          className="flex items-center justify-between gap-3 rounded-xl border border-border-light bg-surface-light px-3.5 py-3 dark:border-border-dark dark:bg-surface-dark"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                              {item.title}
                            </p>
                            <p className="mt-0.5 text-xs text-text-light-tertiary dark:text-text-dark-tertiary">
                              {formatDateTime(item.archivedAt)} · {item.messages.length} 条消息
                              {' · '}
                              {item.mode === 'tools' ? '工具模式' : '聊天模式'}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5 text-xs">
                            <button
                              type="button"
                              data-testid="ai-archive-restore"
                              title="恢复到当前对话"
                              onClick={() => restoreConversation(mode, item.id)}
                              className="flex items-center gap-1 rounded-lg border border-border-light px-2 py-1 font-medium text-text-light-secondary transition-colors hover:border-accent-primary hover:text-accent-primary dark:border-border-dark dark:text-text-dark-secondary"
                            >
                              <ArchiveRestore className="h-3.5 w-3.5" />
                              恢复
                            </button>
                            <button
                              type="button"
                              data-testid="ai-archive-delete"
                              title="永久删除这条归档（再点一次确认）"
                              onClick={() => handleDeleteArchive(item)}
                              className={`flex items-center gap-1 rounded-lg px-2 py-1 transition-colors ${
                                confirming
                                  ? 'bg-accent-red/10 font-semibold text-accent-red'
                                  : 'text-text-light-tertiary hover:text-accent-red dark:text-text-dark-tertiary'
                              }`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              {confirming ? '确认删除？' : '删除'}
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          ) : (
            <AgentMessageList
              containerClassName="min-h-0 flex-1 px-4 py-4 sm:px-6"
              messages={messages}
              isStreaming={isStreaming}
              streamingContent={streamingContent}
              onConfirmAction={confirmAction}
              onRejectAction={rejectAction}
              onUndoAction={undoAction}
              emptyHint={
                <div className="mx-auto flex h-full max-w-3xl flex-col justify-center py-6">
                  <div className="rounded-2xl border border-border-light bg-surface-light p-7 dark:border-border-dark dark:bg-surface-dark">
                    
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-primary/10 text-accent-primary">
                        <Sparkles className="h-6 w-6" />
                      </span>
                      <div>
                        <p className="text-base font-semibold text-text-light-primary dark:text-text-dark-primary">
                          {isToolMode ? '让 AI 替你管理 LifeOS' : '直接说出你希望我生成或解决什么'}
                        </p>
                        <p className="mt-0.5 text-sm text-text-light-secondary dark:text-text-dark-secondary">
                          {isToolMode
                            ? '直接告诉我你想完成什么。可撤销的本地操作会尽量直接完成；只有真正高风险或无法消歧的操作才需要确认。'
                            : '聊天回复不会被解析成应用操作，因此可以放心要求长文、代码、JSON、分析或任意格式。'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              }
            />
          )}

          <div className="shrink-0 border-t border-border-light bg-surface-light px-4 py-3 sm:px-6 dark:border-border-dark dark:bg-surface-dark">
            <AgentComposer
              value={inputDraft}
              onChange={setInputDraft}
              onSend={(text) => sendMessage(text)}
              isStreaming={isStreaming}
              needsSetup={needsSetup}
              quickPrompts={isToolMode ? AGENT_QUICK_PROMPTS : CHAT_QUICK_PROMPTS}
              placeholder={
                isToolMode
                  ? '查询或操作任务、日程、笔记、项目、收藏、自动化、习惯、精力、时间、专注、目标、例行、资源、模板…'
                  : '写作、分析、代码、翻译、构思……直接说你的要求'
              }
              helperText={
                isToolMode
                  ? '可逆操作优先直接完成，高风险操作才确认 · Enter 发送 · Shift+Enter 换行'
                  : '聊天模式不会修改本地数据 · Enter 发送 · Shift+Enter 换行'
              }
              autoFocus
            />

            <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 text-xs">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                {messages.length > 0 ? (
                  <>
                    <button
                      type="button"
                      data-testid="ai-clear-current"
                      onClick={() => clearConversation()}
                      disabled={isStreaming}
                      className="flex items-center gap-1.5 text-text-light-tertiary transition-colors hover:text-accent-red disabled:cursor-not-allowed disabled:opacity-60 dark:text-text-dark-tertiary"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      清空当前对话
                    </button>
                    <button
                      type="button"
                      data-testid="ai-archive-current"
                      onClick={handleArchiveCurrent}
                      disabled={isStreaming}
                      title={`把当前对话移入${modeLabel}归档`}
                      className="flex items-center gap-1.5 text-text-light-tertiary transition-colors hover:text-accent-primary disabled:cursor-not-allowed disabled:opacity-60 dark:text-text-dark-tertiary"
                    >
                      <Archive className="h-3.5 w-3.5" />
                      归档当前对话
                    </button>
                  </>
                ) : (
                  <span className="text-text-light-tertiary dark:text-text-dark-tertiary">
                    {modeLabel} · 对话仅保存在这台设备
                  </span>
                )}
                <button
                  type="button"
                  data-testid="ai-toggle-archives"
                  aria-expanded={showArchives}
                  onClick={toggleArchives}
                  aria-controls="ai-archive-panel"
                  className={`flex items-center gap-1.5 transition-colors ${
                    showArchives
                      ? 'font-semibold text-accent-primary'
                      : 'text-text-light-tertiary hover:text-accent-primary dark:text-text-dark-tertiary'
                  }`}
                >
                  <Archive className="h-3.5 w-3.5" />
                  {modeLabel}归档{archives.length > 0 ? `（${archives.length}）` : ''}
                </button>
              </div>
              <Link
                to="/settings?tab=ai"
                className="font-medium text-accent-primary transition-opacity hover:opacity-80"
              >
                管理 AI 提供商
              </Link>
            </div>
          </div>
        </div>
      </div>

      <AIOperationLogPanel
        open={showOperationLog}
        onClose={() => setShowOperationLog(false)}
        onUndo={(recordId) => void undoOperation(recordId)}
      />
    </section>
  );
};

export const AICommandCenter: React.FC = () => {
  const { pathname } = useLocation();
  if (pathname !== '/ai') return null;
  return <AICommandCenterWorkspace />;
};
