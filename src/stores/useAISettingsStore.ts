/**
 * AI Settings Store
 *
 * Execution authority for the AI management layer:
 * - ask      写操作先经用户确认卡片
 * - auto     可撤销写操作立即执行并写入操作日志（默认）
 * - readonly 只读查询照常,任何写操作被拦截
 *
 * Destructive delete tools are still deferred for explicit confirmation by
 * useAIRuntime even when auto mode is selected. This lets the default feel
 * useful without making irreversible operations silent.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type AIExecutionMode = 'ask' | 'auto' | 'readonly';

export const AI_EXECUTION_MODE_LABELS: Record<AIExecutionMode, string> = {
  ask: '每次确认',
  auto: '自动执行',
  readonly: '只读',
};

export const AI_EXECUTION_MODE_DESCRIPTIONS: Record<AIExecutionMode, string> = {
  ask: '写操作先出确认卡片,逐条/全部确认后才执行',
  auto: '可撤销写操作直接执行并记录日志；删除等高风险操作仍需确认',
  readonly: 'AI 只能查询,所有写操作被拦截',
};

interface AISettingsState {
  executionMode: AIExecutionMode;
  /** Include the privacy-safe "today" count snapshot in agent prompts. */
  todaySnapshotEnabled: boolean;
  /** Record executed operations to the audit log (powered by the log panel). */
  logEnabled: boolean;

  setExecutionMode: (mode: AIExecutionMode) => void;
  setTodaySnapshotEnabled: (enabled: boolean) => void;
  setLogEnabled: (enabled: boolean) => void;
}

export const useAISettingsStore = create<AISettingsState>()(
  persist(
    (set) => ({
      executionMode: 'auto',
      todaySnapshotEnabled: true,
      logEnabled: true,

      setExecutionMode: (mode) => set({ executionMode: mode }),
      setTodaySnapshotEnabled: (enabled) => set({ todaySnapshotEnabled: enabled }),
      setLogEnabled: (enabled) => set({ logEnabled: enabled }),
    }),
    {
      name: 'lifeos-ai-settings-v1',
      version: 1,
      storage: createJSONStorage(() => localStorage),
    }
  )
);
