/**
 * Provider Settings Modal (simplified)
 *
 * Dead-simple AI provider configuration:
 * - Blank fields: type your API key, type your model id, hit 保存. Done —
 *   the provider becomes active immediately.
 * - Model suggestions load in the background via datalist, but any custom
 *   model id can be typed directly.
 * - Every configured provider has a visible 删除 button.
 * - No passwords: keys are encrypted at rest with a device-managed local
 *   key (services/deviceKey) and persist across reloads.
 */

import { useEffect, useRef, useState } from 'react';
import { Modal } from './Modal';
import { ConfirmDialog } from './ConfirmDialog';
import { useTerminalStore } from '../stores/useTerminalStore';
import { AIProviderRouter, PROVIDER_METADATA } from '../services/ai/providerRouter';
import { toast } from '../stores/useToastStore';
import { ChevronDown } from 'lucide-react';

interface ProviderSettingsProps {
  /** Existing modal API. Omitted for the inline settings surface. */
  isOpen?: boolean;
  onClose?: () => void;
  router: AIProviderRouter;
  /** Render inside the current page instead of opening a body-level portal. */
  inline?: boolean;
}

export function ProviderSettings({
  isOpen = true,
  onClose = () => undefined,
  router,
  inline = false,
}: ProviderSettingsProps) {
  const visible = inline || isOpen;
  const setProviderApiKey = useTerminalStore((s) => s.setProviderApiKey);
  const clearProviderApiKey = useTerminalStore((s) => s.clearProviderApiKey);
  const clearRouterKey = router.clearProviderApiKey.bind(router);
  const setActiveProvider = useTerminalStore((s) => s.setActiveProvider);
  const activeProvider = useTerminalStore((s) => s.activeProvider);
  const activeModel = useTerminalStore((s) => s.activeModel);
  const storedProviders = useTerminalStore((s) => s.providers);
  const enableCrossModuleContext = useTerminalStore((s) => s.enableCrossModuleContext);
  const setEnableCrossModuleContext = useTerminalStore((s) => s.setEnableCrossModuleContext);

  // Local draft inputs
  const [apiKeyInputs, setApiKeyInputs] = useState<Record<string, string>>({});
  const [modelInputs, setModelInputs] = useState<Record<string, string>>({});
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [expandedProvider, setExpandedProvider] = useState<string | null>(() => activeProvider);
  const [modelOptions, setModelOptions] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [providerToClear, setProviderToClear] = useState<string | null>(null);
  const loadedModelsRef = useRef<Set<string>>(new Set());

  // Seed the model field of the active provider so "只填密钥也能保存"
  useEffect(() => {
    if (!visible) return;
    setModelInputs((prev) => {
      if (prev[activeProvider]) return prev;
      return { ...prev, [activeProvider]: activeModel };
    });
  }, [visible, activeProvider, activeModel]);

  // Lazily load model suggestions (dynamic SDK import; failures are fine)
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    const loadSuggestions = async () => {
      for (const providerId of Object.keys(PROVIDER_METADATA)) {
        if (cancelled || loadedModelsRef.current.has(providerId)) continue;
        loadedModelsRef.current.add(providerId);
        try {
          const provider = await router.getProvider(providerId);
          if (!cancelled && provider && provider.models.length > 0) {
            setModelOptions((prev) => ({
              ...prev,
              [providerId]: provider.models.map((m) => m.id),
            }));
          }
        } catch {
          // Suggestions are optional; free-text input always works.
        }
      }
    };
    loadSuggestions();
    return () => {
      cancelled = true;
    };
  }, [visible, router]);

  const handleSave = async (providerId: string) => {
    const apiKey = apiKeyInputs[providerId]?.trim();
    if (!apiKey || saving[providerId]) return;

    setSaving((prev) => ({ ...prev, [providerId]: true }));
    try {
      await setProviderApiKey(providerId, apiKey); // encrypt + persist
      router.setProviderApiKey(providerId, apiKey); // hot-load into session

      // Model: user-entered wins; otherwise the provider's default.
      let modelId = modelInputs[providerId]?.trim();
      if (!modelId) {
        try {
          const provider = await router.getProvider(providerId);
          modelId = provider?.getDefaultModel().id ?? '';
        } catch {
          modelId = '';
        }
      }
      if (modelId) {
        setActiveProvider(providerId, modelId);
      }

      setApiKeyInputs((prev) => ({ ...prev, [providerId]: '' }));
      toast.success(
        '已保存',
        `${PROVIDER_METADATA[providerId]?.displayName ?? providerId} 配置完成${modelId ? `，当前模型 ${modelId}` : ''}。`
      );
    } catch (error) {
      console.error('Failed to save API key:', error);
      toast.error('保存失败', '请重试。');
    } finally {
      setSaving((prev) => ({ ...prev, [providerId]: false }));
    }
  };

  const confirmClear = () => {
    if (!providerToClear) return;
    clearProviderApiKey(providerToClear); // remove persisted config
    clearRouterKey(providerToClear); // drop any in-session copy
    setModelInputs((prev) => ({ ...prev, [providerToClear]: '' }));
    setApiKeyInputs((prev) => ({ ...prev, [providerToClear]: '' }));
    toast.success('已删除', '该提供商的 API 密钥与配置已清除。');
    setProviderToClear(null);
  };

  const settingsContent = (
    <div className="space-y-3" data-testid="provider-settings-content">
          {inline && (
            <div className="border-b border-border-light pb-3 dark:border-border-dark">
              <h3 className="text-base font-semibold text-text-light-primary dark:text-text-dark-primary">
                提供商配置
              </h3>
              <p className="mt-1 text-sm text-text-light-secondary dark:text-text-dark-secondary">
                选择一个服务并填入你自己的 API 密钥。配置完成后，AI 指挥中心会立即使用它。
              </p>
            </div>
          )}

          {/* Header */}
          <div className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
            <p>
              填入 <strong>API 密钥</strong> 和 <strong>模型 ID</strong>，点「保存」即可使用。
              密钥在本机加密存储（无需密码），刷新后依然有效。
            </p>
          </div>

          {/* Provider rows */}
          <div
            className={
              inline
                ? 'grid gap-3 xl:grid-cols-2'
                : 'max-h-[60vh] space-y-2 overflow-y-auto pr-1'
            }
          >
            {Object.entries(PROVIDER_METADATA).map(([providerId, metadata]) => {
              const isConfigured = Boolean(storedProviders[providerId]?.isConfigured);
              const isActive = activeProvider === providerId;

              return (
                <div
                  key={providerId}
                  data-testid={`provider-row-${providerId}`}
                  className={`rounded-button border p-3 ${
                    isActive
                      ? 'border-accent-primary/50 bg-accent-primary/5'
                      : 'border-border-light bg-surface-light-elevated dark:border-border-dark dark:bg-surface-dark-elevated'
                  }`}
                >
                  {/* Row header */}
                  <div className={`${!inline || expandedProvider === providerId ? 'mb-2' : ''} flex items-center justify-between gap-2`}>
                    <button
                      type="button"
                      onClick={() => inline && setExpandedProvider((current) => current === providerId ? null : providerId)}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      aria-expanded={!inline || expandedProvider === providerId}
                    >
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent-primary/10 text-xs font-semibold uppercase text-accent-primary"
                        aria-hidden="true"
                      >
                        {metadata.displayName.slice(0, 2)}
                      </span>
                      <span className="truncate text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                        {metadata.displayName}
                      </span>
                      {metadata.hasFreeModels && (
                        <span className="rounded bg-accent-green/10 px-1.5 py-0.5 text-xs text-accent-green">
                          免费模型
                        </span>
                      )}
                      {!metadata.supportsCORS && metadata.requiresProxy && (
                        <span
                          className="cursor-help rounded bg-accent-yellow/10 px-1.5 py-0.5 text-xs text-accent-yellow"
                          title="该提供商阻止浏览器直连（CORS）。推荐用 OpenRouter——一个密钥可访问其模型。"
                        >
                          ⚠️ 需代理
                        </span>
                      )}
                      {isConfigured ? (
                        <span className="rounded bg-accent-green/10 px-1.5 py-0.5 text-xs text-accent-green">
                          ✓ 已配置{isActive ? ' · 使用中' : ''}
                        </span>
                      ) : null}
                      {inline && (
                        <ChevronDown className={`ml-auto h-4 w-4 shrink-0 text-text-light-tertiary transition-transform dark:text-text-dark-tertiary ${expandedProvider === providerId ? 'rotate-180' : ''}`} />
                      )}
                    </button>
                    {metadata.apiKeyUrl && (
                      <a
                        href={metadata.apiKeyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 text-xs text-accent-primary hover:opacity-80"
                      >
                        获取密钥 →
                      </a>
                    )}
                  </div>

                  {/* Inputs */}
                  {(!inline || expandedProvider === providerId) && <div className="space-y-2">
                    <input
                      type={showKey[providerId] ? 'text' : 'password'}
                      value={apiKeyInputs[providerId] ?? ''}
                      onChange={(e) =>
                        setApiKeyInputs((prev) => ({ ...prev, [providerId]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSave(providerId);
                      }}
                      placeholder={
                        isConfigured
                          ? '已保存密钥（输入新密钥可替换）'
                          : `粘贴你的 ${metadata.apiKeyLabel ?? 'API 密钥'}`
                      }
                      autoComplete="off"
                      className="w-full rounded-button border border-border-light bg-surface-light px-3 py-2 text-sm text-text-light-primary focus:outline-none focus:ring-2 focus:ring-accent-primary dark:border-border-dark dark:bg-surface-dark dark:text-text-dark-primary"
                    />

                    <div className="flex items-center gap-1.5">
                      <span className="w-9 shrink-0 text-xs text-text-light-secondary dark:text-text-dark-secondary">
                        模型
                      </span>
                      <input
                        list={`models-${providerId}`}
                        value={modelInputs[providerId] ?? ''}
                        onChange={(e) =>
                          setModelInputs((prev) => ({ ...prev, [providerId]: e.target.value }))
                        }
                        placeholder="留空则使用默认模型，或输入任意模型 ID"
                        className="min-w-0 flex-1 rounded-button border border-border-light bg-surface-light px-2.5 py-1.5 text-sm text-text-light-primary placeholder-text-light-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary dark:border-border-dark dark:bg-surface-dark dark:text-text-dark-primary dark:placeholder-text-dark-tertiary"
                      />
                      <datalist id={`models-${providerId}`}>
                        {(modelOptions[providerId] ?? []).map((m) => (
                          <option key={m} value={m} />
                        ))}
                      </datalist>
                      <button
                        type="button"
                        onClick={() =>
                          setShowKey((prev) => ({ ...prev, [providerId]: !prev[providerId] }))
                        }
                        className="shrink-0 text-xs text-text-light-secondary hover:text-text-light-primary dark:text-text-dark-secondary dark:hover:text-text-dark-primary"
                      >
                        {showKey[providerId] ? '隐藏' : '显示'}
                      </button>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <button
                        onClick={() => handleSave(providerId)}
                        disabled={!apiKeyInputs[providerId]?.trim() || saving[providerId]}
                        className="rounded-button bg-accent-primary px-3 py-1.5 text-sm text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-surface-light-elevated disabled:text-text-light-tertiary dark:disabled:bg-surface-dark-elevated dark:disabled:text-text-dark-tertiary"
                      >
                        {saving[providerId] ? '保存中…' : isConfigured ? '更新并启用' : '保存并启用'}
                      </button>
                      {isConfigured && (
                        <button
                          onClick={() => setProviderToClear(providerId)}
                          className="rounded-button border border-accent-red/20 bg-accent-red/10 px-3 py-1.5 text-sm text-accent-red transition-colors hover:bg-accent-red/20"
                        >
                          删除配置
                        </button>
                      )}
                    </div>
                  </div>}
                </div>
              );
            })}
          </div>

          {/* Cross-module context toggle */}
          <div className="space-y-2 border-t border-border-light pt-3 dark:border-border-dark">
            <div className="flex items-start justify-between gap-4 rounded-button border border-border-light bg-surface-light-elevated p-3 dark:border-border-dark dark:bg-surface-dark-elevated">
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-text-light-primary dark:text-text-dark-primary">
                  跨模块上下文
                </div>
                <div className="mt-0.5 text-sm text-text-light-secondary dark:text-text-dark-secondary">
                  在 AI 对话中包含笔记、任务、日历和习惯的数据
                </div>
              </div>
              <button
                role="switch"
                aria-checked={enableCrossModuleContext}
                onClick={() => setEnableCrossModuleContext(!enableCrossModuleContext)}
                className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary ${
                  enableCrossModuleContext
                    ? 'bg-accent-primary'
                    : 'border border-border-light bg-surface-dark dark:border-border-dark'
                }`}
                aria-label="切换跨模块上下文"
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ${
                    enableCrossModuleContext ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Footer for the legacy modal presentation */}
          {!inline && (
            <div className="flex justify-end border-t border-border-light pt-3 dark:border-border-dark">
              <button
                onClick={onClose}
                className="rounded-button bg-accent-primary px-3 py-1.5 text-sm text-white transition-opacity hover:opacity-90"
              >
                完成
              </button>
            </div>
          )}
    </div>
  );

  return (
    <>
      {inline ? (
        <section
          aria-label="AI 提供商设置"
          className="rounded-xl border border-border-light bg-surface-light p-4 dark:border-border-dark dark:bg-surface-dark"
        >
          {settingsContent}
        </section>
      ) : (
        <Modal isOpen={isOpen} onClose={onClose} title="AI 提供商设置" maxWidth="2xl">
          {settingsContent}
        </Modal>
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={providerToClear !== null}
        onClose={() => setProviderToClear(null)}
        onConfirm={confirmClear}
        title="删除提供商配置"
        message={
          providerToClear
            ? `确定删除 ${
                PROVIDER_METADATA[providerToClear]?.displayName ?? providerToClear
              } 的 API 密钥与配置？之后可随时重新填写。`
            : ''
        }
        confirmText="删除"
        variant="danger"
      />
    </>
  );
}
