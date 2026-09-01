import React, { useState, useMemo, useEffect } from 'react';
import { Bot } from 'lucide-react';
import { useTerminalStore } from '../../stores/useTerminalStore';
import {
  AI_EXECUTION_MODE_DESCRIPTIONS,
  AI_EXECUTION_MODE_LABELS,
  useAISettingsStore,
  type AIExecutionMode,
} from '../../stores/useAISettingsStore';
import { ProviderSettings } from '../../components/ProviderSettings';
import { createDefaultRouter, PROVIDER_METADATA } from '../../services/ai/providerRouter';
import { logger } from '../../services/logger';

const log = logger.module('AI:Settings');

/**
 * Provider configuration for the single AI Command Center surface.
 * The internal store name remains for data compatibility with older releases.
 */
export const AITerminalSettingsSection: React.FC = () => {
  const providers = useTerminalStore((s) => s.providers);
  const activeProvider = useTerminalStore((s) => s.activeProvider);
  const activeModel = useTerminalStore((s) => s.activeModel);

  const [configuredCount, setConfiguredCount] = useState(0);
  const providerCount = Object.keys(PROVIDER_METADATA).length;

  // Create router for settings (shares store with AITerminal)
  const router = useMemo(() => createDefaultRouter(), []);

  // Initialize API keys and count configured providers.
  // Keys decrypt with the device-managed local key (no password).
  useEffect(() => {
    const initializeAndCount = async () => {
      const allProviderIds = Object.keys(PROVIDER_METADATA);
      for (const providerId of allProviderIds) {
        const providerConfig = providers[providerId];
        if (providerConfig && providerConfig.encryptedApiKey) {
          try {
            const decryptedKey = await useTerminalStore.getState().getProviderApiKey(providerId);
            if (decryptedKey) {
              router.setProviderApiKey(providerId, decryptedKey);
            }
          } catch (error) {
            log.error(`Failed to decrypt ${providerId} API key`, { error });
          }
        }
      }

      // Count configured providers
      const configured = await router.getConfiguredProviders();
      setConfiguredCount(configured.length);
    };

    initializeAndCount();
  }, [providers, router]);

  // Recount when providers change
  useEffect(() => {
    const countConfigured = async () => {
      const configured = await router.getConfiguredProviders();
      setConfiguredCount(configured.length);
    };
    countConfigured();
  }, [providers, router]);

  return (
    <div className="bento-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Bot className="h-5 w-5 text-text-light-tertiary dark:text-text-dark-tertiary" />
          <div>
            <h2 className="text-base font-semibold text-text-light-primary dark:text-text-dark-primary">
              AI 提供商
            </h2>
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
              为 AI 指挥中心配置服务，当前支持 {providerCount} 家提供商
            </p>
          </div>
        </div>
      </div>

      {/* Provider Status */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-surface-light-elevated dark:bg-surface-dark-elevated rounded-lg">
          <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mb-1">已配置提供商</p>
          <p className="text-2xl font-semibold text-text-light-primary dark:text-text-dark-primary">
            {configuredCount} <span className="text-sm font-normal text-text-light-secondary dark:text-text-dark-secondary">/ {providerCount}</span>
          </p>
        </div>
        <div className="p-4 bg-surface-light-elevated dark:bg-surface-dark-elevated rounded-lg">
          <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mb-1">当前提供商</p>
          <p className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary truncate">
            {activeProvider ? (
              <>
                {PROVIDER_METADATA[activeProvider]?.displayName || activeProvider}
                {activeModel && (
                  <span className="text-sm font-normal text-text-light-secondary dark:text-text-dark-secondary block truncate">
                    {activeModel}
                  </span>
                )}
              </>
            ) : (
              <span className="text-text-light-secondary dark:text-text-dark-secondary">未选择</span>
            )}
          </p>
        </div>
      </div>

      {/* Provider configuration stays inside Settings instead of opening a full-screen portal. */}
      <div className="mb-6">
        <ProviderSettings inline router={router} />
      </div>

      {/* AI 执行权限与上下文 */}
      <AIAccessSettings />

      {/* Chat History Privacy Note */}
      <div className="rounded-lg border border-border-light bg-surface-light-elevated p-4 dark:border-border-dark dark:bg-surface-dark-elevated">
        <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
          <strong>本地与隐私：</strong>API 密钥使用设备管理的本地密钥加密；对话保存在当前浏览器中，可随时在 AI 指挥中心清空。只有你主动发送消息时，相关内容才会发往所选提供商。
        </p>
      </div>
    </div>
  );
};

/** AI 执行权限与今日快照偏好。 */
function AIAccessSettings() {
  const executionMode = useAISettingsStore((s) => s.executionMode);
  const setExecutionMode = useAISettingsStore((s) => s.setExecutionMode);
  const todaySnapshotEnabled = useAISettingsStore((s) => s.todaySnapshotEnabled);
  const setTodaySnapshotEnabled = useAISettingsStore((s) => s.setTodaySnapshotEnabled);
  const logEnabled = useAISettingsStore((s) => s.logEnabled);
  const setLogEnabled = useAISettingsStore((s) => s.setLogEnabled);

  const modes: AIExecutionMode[] = ['ask', 'auto', 'readonly'];

  return (
    <div className="mb-6 rounded-lg border border-border-light bg-surface-light-elevated p-4 dark:border-border-dark dark:bg-surface-dark-elevated">
      <p className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
        AI 执行权限
      </p>
      <p className="mt-0.5 text-xs text-text-light-secondary dark:text-text-dark-secondary">
        决定 AI 管理模式中写操作(创建/修改/删除)如何落地；可在 AI 工作区顶部随时切换。
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {modes.map((mode) => (
          <button
            key={mode}
            type="button"
            aria-pressed={executionMode === mode}
            onClick={() => setExecutionMode(mode)}
            className={`min-w-28 flex-1 rounded-xl border px-3 py-2.5 text-left transition-all ${
              executionMode === mode
                ? 'border-accent-primary bg-accent-primary/10'
                : 'border-border-light bg-surface-light hover:border-accent-primary/40 dark:border-border-dark dark:bg-surface-dark'
            }`}
          >
            <span className={`block text-sm font-semibold ${executionMode === mode ? 'text-accent-primary' : 'text-text-light-primary dark:text-text-dark-primary'}`}>
              {AI_EXECUTION_MODE_LABELS[mode]}
            </span>
            <span className="mt-0.5 block text-[11px] leading-relaxed text-text-light-secondary dark:text-text-dark-secondary">
              {AI_EXECUTION_MODE_DESCRIPTIONS[mode]}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-2.5 border-t border-border-light/60 pt-3 dark:border-border-dark/60">
        <label className="flex cursor-pointer items-center justify-between gap-3 text-xs text-text-light-secondary dark:text-text-dark-secondary">
          <span>
            <strong className="text-text-light-primary dark:text-text-dark-primary">今日快照</strong>
            <span className="ml-1.5">在提示词中注入今日计数摘要(仅数量，不包含内容)，让 AI 感知你的当天状态</span>
          </span>
          <input
            type="checkbox"
            checked={todaySnapshotEnabled}
            onChange={(e) => setTodaySnapshotEnabled(e.target.checked)}
            className="h-4 w-4 accent-[var(--accent-primary)]"
          />
        </label>
        <label className="flex cursor-pointer items-center justify-between gap-3 text-xs text-text-light-secondary dark:text-text-dark-secondary">
          <span>
            <strong className="text-text-light-primary dark:text-text-dark-primary">操作日志</strong>
            <span className="ml-1.5">每次 AI 执行写操作都记录到「操作记录」(可查看结果、一键撤销)</span>
          </span>
          <input
            type="checkbox"
            checked={logEnabled}
            onChange={(e) => setLogEnabled(e.target.checked)}
            className="h-4 w-4 accent-[var(--accent-primary)]"
          />
        </label>
      </div>
    </div>
  );
}
