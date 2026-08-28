/**
 * AI Terminal Settings Component
 *
 * Multi-provider AI configuration information and setup instructions.
 * Actual provider configuration is done via the AI Terminal's settings modal.
 */

import React from 'react';
export const AITerminalSettings: React.FC = () => {
  return (
    <div className="bento-card p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">🤖</span>
        <h2 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">
          AI Terminal
        </h2>
      </div>

      <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-4">
        支持 8 家提供商（含免费选项）的多提供商 AI 助手。自动切换确保可靠性。
      </p>

      {/* Quick Info */}
      <div className="mb-6 p-4 bg-status-info-bg dark:bg-status-info-bg-dark border border-status-info-border dark:border-status-info-border-dark rounded-lg">
        <p className="text-sm text-status-info-text dark:text-status-info-text-dark mb-2">
          <strong>🎯 全新多提供商系统</strong>
        </p>
        <ul className="text-xs text-status-info-text dark:text-status-info-text-dark space-y-1">
          <li>• 从 8 家 AI 提供商中选择（OpenRouter、Groq、HuggingFace、Mistral、Gemini、OpenAI、Claude、Grok）</li>
          <li>• 提供免费模型（OpenRouter、Groq、HuggingFace、Mistral）</li>
          <li>• 主提供商失败时自动切换</li>
          <li>• API 密钥使用设备密钥加密后保存在本机，无需另设密码</li>
          <li>• 按提供商统计使用量</li>
        </ul>
      </div>

      {/* Configure Providers Button */}
      <div className="space-y-4">
        <p className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
          点击右下角的 AI Terminal 按钮，然后点击 ⚙️ 设置以配置提供商。
        </p>

        <div className="p-4 bg-surface-light-elevated dark:bg-surface-dark-elevated rounded-lg">
          <p className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">
            设置方法：
          </p>
          <ol className="text-sm text-text-light-secondary dark:text-text-dark-secondary space-y-1 list-decimal list-inside">
            <li>打开 AI Terminal（右下角的 🤖 按钮）</li>
            <li>点击终端顶部的 ⚙️ 设置按钮</li>
            <li>为你偏好的提供商添加 API 密钥</li>
            <li>使用 🔀 按钮选择模型</li>
            <li>开始聊天吧！</li>
          </ol>
        </div>

        {/* Free Provider Quick Links */}
        <div className="p-4 bg-status-success-bg dark:bg-status-success-bg-dark border border-status-success-border dark:border-status-success-border-dark rounded-lg">
          <p className="text-sm font-semibold text-status-success-text dark:text-status-success-text-dark mb-2">
            免费提供商 API 密钥：
          </p>
          <ul className="text-sm text-status-success-text dark:text-status-success-text-dark space-y-1">
            <li>
              • <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">OpenRouter</a> - 访问 200+ 模型（Llama 3.3、Gemini 2.0）
            </li>
            <li>
              • <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">Groq</a> - 闪电般快速的推理
            </li>
            <li>
              • <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">HuggingFace</a> - 数千个开源模型
            </li>
            <li>
              • <a href="https://console.mistral.ai/api-keys/" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">Mistral</a> - 欧洲 AI 提供商
            </li>
          </ul>
        </div>

      </div>

      {/* Features List */}
      <div className="mt-6 p-4 bg-surface-light-elevated dark:bg-surface-dark-elevated rounded-lg">
        <p className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">
          AI Terminal 能做什么？
        </p>
        <ul className="text-sm text-text-light-secondary dark:text-text-dark-secondary space-y-1">
          <li>💬 回答任何主题的问题</li>
          <li>💻 生成并解释代码（React、TypeScript、JavaScript）</li>
          <li>🔧 帮助调试错误和问题</li>
          <li>📝 协助提升效率与规划</li>
          <li>🔄 提供商失败时自动切换</li>
          <li>📊 跟踪所有提供商的使用情况</li>
        </ul>
      </div>
    </div>
  );
};
